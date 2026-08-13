import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import OpenAI from 'openai';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const YANDEX_FOLDER  = process.env.YANDEX_FOLDER  || 'b1gcr5m4ptniag2qpsqm';
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || '';

// OpenCode Go — OpenAI-compatible endpoint
const OPENCODE_BASE_URL = 'https://opencode.ai/zen/go/v1';

// Primary models (tried in order)  
const OPENCODE_MODELS = [
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'glm-5.1',
  'kimi-k2.5',
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function is429(e: any): boolean {
  return (
    e?.status === 429 ||
    String(e?.message || '').includes('429') ||
    String(e?.message || '').includes('rate') ||
    String(e?.message || '').includes('quota')
  );
}

function isNotFound(e: any): boolean {
  return (
    e?.status === 404 ||
    String(e?.message || '').includes('NOT_FOUND') ||
    String(e?.message || '').includes('not found')
  );
}

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
      ru: String(parsed.ru || '').slice(0, 500),
      en: String(parsed.en || '').slice(0, 500),
      ka: String(parsed.ka || '').slice(0, 500),
    };
  } catch {
    const get = (key: string) => {
      const m = clean.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      return m ? m[1] : '';
    };
    return {
      ru: get('ru').slice(0, 500),
      en: get('en').slice(0, 500),
      ka: get('ka').slice(0, 500),
    };
  }
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

function buildDescriptionPrompt(name: string, cat: string) {
  return `You are a product copywriter for an online store in Georgia (country).
Write a short product description (2-3 sentences, max 200 chars each) for:
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
): Promise<{ ru: string; en: string; ka: string }> {
  if (!OPENCODE_API_KEY) throw new Error('OPENCODE_API_KEY not set');

  const client = new OpenAI({
    apiKey: OPENCODE_API_KEY,
    baseURL: OPENCODE_BASE_URL,
  });

  const prompt = mode === 'description'
    ? buildDescriptionPrompt(name, cat)
    : buildNamePrompt(name);

  for (const model of OPENCODE_MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a product copywriter. Return only valid JSON. No markdown, no extra text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const text = response.choices?.[0]?.message?.content || '';
      return parseJson(text);
    } catch (e: any) {
      if (is429(e) || isNotFound(e)) {
        console.warn(`OpenCode model ${model} failed (${e?.status}), trying next…`);
        continue;
      }
      throw e;
    }
  }

  throw new Error('All OpenCode models exhausted');
}

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

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const {
    name_ru, name_en, name_ka,
    category, sub_category,
    provider = 'opencode',   // default → opencode
    mode = 'description',
  } = await req.json();

  const name = name_ru || name_en || name_ka;
  if (!name) return NextResponse.json({ error: 'Нет названия товара' }, { status: 400 });

  const cat = sub_category
    ? `${category} / ${sub_category}`
    : (category || '');

  try {
    let result: { ru: string; en: string; ka: string };

    if (provider === 'yandex') {
      // Явно выбран Yandex
      result = await generateWithYandex(name, cat, mode);
    } else {
      // opencode (default) → при ошибке fallback на Yandex
      try {
        result = await generateWithOpenCode(name, cat, mode);
      } catch (e: any) {
        console.warn('OpenCode failed, falling back to Yandex:', e?.message);
        result = await generateWithYandex(name, cat, mode);
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Generate description error:', e?.message || e);
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}