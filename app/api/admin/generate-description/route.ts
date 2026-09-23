import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import OpenAI from 'openai';
import { aiChat, aiKeyName, AI_MODELS, yandexFallbackEnabled } from '@/lib/ai';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const YANDEX_FOLDER  = process.env.YANDEX_FOLDER  || 'b1gcr5m4ptniag2qpsqm';
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';



// ─── HELPERS ──────────────────────────────────────────────────────────────────

function parseJson(text: string): { ru: string; en: string; ka: string } {
  let clean = text.replace(/```json\s*|\s*```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  clean = match[0]
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\n/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ');

  try {
    const parsed = JSON.parse(clean);
    return {
      ru: String(parsed.ru || '').slice(0, 2000),
      en: String(parsed.en || '').slice(0, 2000),
      ka: String(parsed.ka || '').slice(0, 2000),
    };
  } catch {
    const get = (key: string) => {
      const m = clean.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      return m ? m[1] : '';
    };
    return {
      ru: get('ru').slice(0, 2000),
      en: get('en').slice(0, 2000),
      ka: get('ka').slice(0, 2000),
    };
  }
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

function buildDescriptionPrompt(name: string, cat: string) {
  return `You are a product copywriter for an online store in Georgia (country).
Write a product description of 80-140 words per language for:
Product: ${name}
Category: ${cat}

Return ONLY this JSON (no markdown, no newlines inside values):
{"ru":"описание на русском","en":"description in english","ka":"აღწერა ქართულად"}`;
}

function buildNamePrompt(name: string) {
  return `Translate this product name into English and Georgian.
Product name: ${name}

Return ONLY this JSON (no markdown, no newlines inside values):
{"ru":"${name}","en":"translation in english","ka":"თარგმანი ქართულად"}`;
}

// ─── PROVIDERS ────────────────────────────────────────────────────────────────

async function generateWithOpenCode(
  name: string,
  cat: string,
  mode: 'description' | 'name'
): Promise<{ ru: string; en: string; ka: string; _meta: Meta }> {
  const r = await aiChat({
    system: 'You are a product copywriter. Return only valid JSON. No markdown, no extra text.',
    user: mode === 'description' ? buildDescriptionPrompt(name, cat) : buildNamePrompt(name),
    temperature: 0.3,
    maxTokens: mode === 'description' ? 2500 : 400,
  });
  return { ...parseJson(r.text), _meta: { provider: 'opencode', model: r.model, ms: r.ms, skipped: r.skipped } };
}

type Meta = { provider: 'opencode' | 'yandex'; model: string; ms: number; skipped?: string[] };

async function generateWithYandex(
  name: string,
  cat: string,
  mode: 'description' | 'name'
): Promise<{ ru: string; en: string; ka: string }> {
  if (!YANDEX_API_KEY) throw new Error('YANDEX_API_KEY not set');

  const client = new OpenAI({
    apiKey: YANDEX_API_KEY,
    baseURL: 'https://ai.api.cloud.yandex.net/v1',
    defaultHeaders: { 'OpenAI-Project': YANDEX_FOLDER },
  });

  const prompt = mode === 'description'
    ? buildDescriptionPrompt(name, cat)
    : buildNamePrompt(name);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await (client as any).responses.create({
      model: `gpt://${YANDEX_FOLDER}/yandexgpt-5.1/latest`,
      instructions: 'You are a product copywriter. Return only valid JSON. No markdown, no extra text.',
      input: prompt,
      temperature: 0.3,
      max_output_tokens: 800,
    });

    const raw: string =
      (response as any).output_text ??
      (response as any).output?.[0]?.content?.[0]?.text ??
      '';

    if (raw.includes('}')) {
      try {
        return parseJson(raw);
      } catch {
        console.warn(`Yandex attempt ${attempt} parse failed, retrying…`);
      }
    } else {
      console.warn(`Yandex attempt ${attempt} truncated, retrying…`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  throw new Error('Yandex returned truncated response after 3 attempts');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

/**
 * GET — состояние AI без единого платного запроса: есть ли ключ, какие
 * модели в очереди, включён ли фолбэк на Yandex. Показывается в админке,
 * чтобы было видно, что работает, а не угадывать по счёту.
 */
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  return NextResponse.json({
    opencode: { keyVar: aiKeyName(), models: AI_MODELS() },
    yandex:   { configured: Boolean(YANDEX_API_KEY), fallback: yandexFallbackEnabled() },
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const {
    name_ru, name_en, name_ka,
    category, sub_category,
    mode = 'description',
  } = await req.json();

  // Параметр provider от клиента больше не принимаем: форма товара слала
  // 'yandex' жёстко, и OpenCode не пробовался вообще. Провайдер решает сервер.

  const name = name_ru || name_en || name_ka;
  if (!name) return NextResponse.json({ error: 'Нет названия' }, { status: 400 });

  const cat = sub_category ? `${category} / ${sub_category}` : (category || '');

  try {
    const r = await generateWithOpenCode(name, cat, mode);
    const { _meta, ...texts } = r;
    return NextResponse.json({ ...texts, meta: _meta });
  } catch (e: any) {
    console.warn('[AI] OpenCode не ответил:', e?.message);

    // Yandex — только если это явно разрешено переменной окружения.
    // Раньше любая ошибка молча уходила туда, и деньги списывались
    // без единого следа в интерфейсе.
    if (yandexFallbackEnabled() && YANDEX_API_KEY) {
      try {
        const started = Date.now();
        const y = await generateWithYandex(name, cat, mode);
        return NextResponse.json({
          ...y,
          meta: { provider: 'yandex', model: 'yandexgpt-5.1', ms: Date.now() - started,
                  note: `фолбэк: ${String(e?.message).slice(0, 120)}` },
        });
      } catch (ye: any) {
        return NextResponse.json(
          { error: `OpenCode: ${e?.message}. Yandex: ${ye?.message}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}
