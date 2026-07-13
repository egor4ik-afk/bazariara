import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sql from '@/lib/db';
import OpenAI from 'openai';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const YANDEX_FOLDER    = process.env.YANDEX_FOLDER    || 'b1gcr5m4ptniag2qpsqm';
const YANDEX_API_KEY   = process.env.YANDEX_API_KEY   || '';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || '';

const OPENCODE_BASE_URL = 'https://opencode.ai/zen/go/v1';
const OPENCODE_MODELS   = ['deepseek-v4-pro', 'deepseek-v4-flash', 'glm-5.1', 'kimi-k2.5'];

// ─── TRANSLATOR (Google Translate — free, no key needed) ──────────────────────

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text) return '';
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!res.ok) throw new Error(`Translation API ${res.status}`);
    const data = await res.json();
    return data[0].map((t: any) => t[0]).join('');
  } catch (err) {
    console.error(`Translation to ${targetLang} failed:`, err);
    return text;
  }
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

function buildDescriptionPrompt(name: string, cat: string): string {
  return `Ты копирайтер для интернет-магазина в Грузии. Напиши краткое продающее описание товара на русском языке (2-3 предложения, максимум 300 символов).
Товар: ${name}
Категория: ${cat}

Верни ТОЛЬКО текст описания, без маркдауна, кавычек и лишних слов.`;
}

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

// ─── OPENCODE PROVIDER ────────────────────────────────────────────────────────

async function generateWithOpenCode(prompt: string): Promise<string> {
  if (!OPENCODE_API_KEY) throw new Error('OPENCODE_API_KEY not set');

  const client = new OpenAI({
    apiKey: OPENCODE_API_KEY,
    baseURL: OPENCODE_BASE_URL,
  });

  for (const model of OPENCODE_MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'Ты профессиональный копирайтер. Верни только текст ответа без лишних комментариев.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
      });

      const text = response.choices?.[0]?.message?.content || '';
      if (text) return text.trim();
      throw new Error('Empty response');
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

// ─── YANDEX PROVIDER (fallback) ───────────────────────────────────────────────

async function generateWithYandex(prompt: string): Promise<string> {
  if (!YANDEX_API_KEY) throw new Error('YANDEX_API_KEY not set');

  const client = new OpenAI({
    apiKey: YANDEX_API_KEY,
    baseURL: 'https://ai.api.cloud.yandex.net/v1',
    defaultHeaders: { 'OpenAI-Project': YANDEX_FOLDER },
  });

  const response = await (client as any).responses.create({
    model: `gpt://${YANDEX_FOLDER}/yandexgpt-5.1/latest`,
    instructions: 'Ты профессиональный копирайтер. Верни только текст ответа без лишних комментариев.',
    input: prompt,
    temperature: 0.3,
    max_output_tokens: 600,
  });

  return (
    (response as any).output_text ??
    (response as any).output?.[0]?.content?.[0]?.text ??
    ''
  ).trim();
}

// ─── MAIN GENERATOR ───────────────────────────────────────────────────────────

async function generate(
  name: string,
  cat: string,
  mode: 'description' | 'name',
  provider: string
): Promise<{ ru: string; en: string; ka: string }> {

  // Имена — просто переводим через Google Translate (быстро и бесплатно)
  if (mode === 'name') {
    const [en, ka] = await Promise.all([
      translateText(name, 'en'),
      translateText(name, 'ka'),
    ]);
    return { ru: name, en, ka };
  }

  // Описание — генерируем через AI, потом переводим
  const prompt = buildDescriptionPrompt(name, cat);
  let textRu = '';

  if (provider === 'yandex') {
    // Явно выбран Yandex
    textRu = await generateWithYandex(prompt);
  } else {
    // opencode → fallback Yandex
    try {
      textRu = await generateWithOpenCode(prompt);
    } catch (e: any) {
      console.warn('OpenCode failed, falling back to Yandex:', e?.message);
      textRu = await generateWithYandex(prompt);
    }
  }

  const cleanRu = textRu.replace(/```.*?```/gs, '').trim();

  const [en, ka] = await Promise.all([
    translateText(cleanRu, 'en'),
    translateText(cleanRu, 'ka'),
  ]);

  return {
    ru: cleanRu.slice(0, 500),
    en: en.slice(0, 500),
    ka: ka.slice(0, 500),
  };
}

// ─── API HANDLER ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { ids, field, provider = 'opencode', batch_size = 50 } = await req.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Нет ids' }, { status: 400 });
  }

  const results: { id: number; ok: boolean; error?: string }[] = [];
  const chunk = ids.slice(0, batch_size);

  for (const id of chunk) {
    try {
      const rows = await sql`
        SELECT id, name_ru, name_en, name_ka, category, sub_category,
               description_ru, description_en, description_ka
        FROM products WHERE id = ${id} AND source = 'gorgia'
      `;
      if (!rows[0]) { results.push({ id, ok: false, error: 'not found' }); continue; }

      const p    = rows[0];
      const name = (p.name_ru || p.name_en || p.name_ka) as string;
      const cat  = p.sub_category
        ? `${p.category} / ${p.sub_category}`
        : (p.category as string || '');

      if (field === 'description') {
        const desc = await generate(name, cat, 'description', provider);
        await sql`
          UPDATE products SET
            description_ru = COALESCE(NULLIF(description_ru, ''), ${desc.ru}),
            description_en = COALESCE(NULLIF(description_en, ''), ${desc.en}),
            description_ka = COALESCE(NULLIF(description_ka, ''), ${desc.ka}),
            updated_at = NOW()
          WHERE id = ${id}
        `;
        results.push({ id, ok: true });

      } else if (field === 'name_en') {
        if (p.name_en) { results.push({ id, ok: true }); continue; }
        const desc = await generate(name, cat, 'name', provider);
        await sql`UPDATE products SET name_en = ${desc.en}, updated_at = NOW() WHERE id = ${id}`;
        results.push({ id, ok: true });

      } else if (field === 'name_ka') {
        if (p.name_ka) { results.push({ id, ok: true }); continue; }
        const desc = await generate(name, cat, 'name', provider);
        await sql`UPDATE products SET name_ka = ${desc.ka}, updated_at = NOW() WHERE id = ${id}`;
        results.push({ id, ok: true });

      } else {
        results.push({ id, ok: false, error: 'unknown field' });
      }

      // Небольшая пауза чтобы не флудить API
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      results.push({ id, ok: false, error: String(e) });
    }
  }

  const ok  = results.filter(r =>  r.ok).length;
  const err = results.filter(r => !r.ok).length;
  return NextResponse.json({ ok, err, results });
}
