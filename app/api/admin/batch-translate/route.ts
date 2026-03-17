import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const YANDEX_FOLDER  = process.env.YANDEX_FOLDER || 'b1gcr5m4ptniag2qpsqm';
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-002'];

// ─── TRANSLATOR HELPER ────────────────────────────────────────────────────────

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text) return '';
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,
      { method: 'GET' }
    );
    if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
    const data = await res.json();
    return data[0].map((t: any) => t[0]).join('');
  } catch (err) {
    console.error(`Translation to ${targetLang} failed:`, err);
    return text; // Fallback to original if translation fails
  }
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────

function buildDescriptionPrompt(name: string, cat: string) {
  return `Ты копирайтер для интернет-магазина. Напиши краткое и продающее описание товара на русском языке (2-3 предложения, максимум 300 символов).
Товар: ${name}
Категория: ${cat}

Верни ТОЛЬКО текст описания, без маркдауна, кавычек и лишних слов.`;
}

// ─── PROVIDERS ────────────────────────────────────────────────────────────────

function is429(e: any): boolean {
  return (
    e?.status === 429 || e?.code === 429 ||
    String(e?.message || '').includes('429') ||
    String(e?.message || '').includes('RESOURCE_EXHAUSTED') ||
    String(e?.message || '').includes('quota')
  );
}

function isNotFound(e: any): boolean {
  return (
    e?.status === 404 || e?.code === 404 ||
    String(e?.message || '').includes('NOT_FOUND') ||
    String(e?.message || '').includes('is not found')
  );
}

async function generateWithYandex(prompt: string): Promise<string> {
  const client = new OpenAI({
    apiKey: YANDEX_API_KEY,
    baseURL: 'https://ai.api.cloud.yandex.net/v1',
    defaultHeaders: { 'OpenAI-Project': YANDEX_FOLDER },
  });

  const response = await client.responses.create({
    model: `gpt://${YANDEX_FOLDER}/yandexgpt-5.1/latest`,
    instructions: 'Ты профессиональный копирайтер. Верни только текст ответа без лишних комментариев.',
    input: prompt,
    temperature: 0.3,
    max_output_tokens: 2000,
  } as any);

  const raw = (response as any).output_text
    ?? (response as any).output?.[0]?.content?.[0]?.text
    ?? '';

  return raw.trim();
}

async function generateWithGemini(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return (response.text || '').trim();
    } catch (e: any) {
      if (is429(e) || isNotFound(e)) {
        console.warn(`${model} failed (${e?.status}), trying next…`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('All Gemini models exhausted');
}

// ─── MAIN GENERATOR ───────────────────────────────────────────────────────────

async function generate(
  name: string,
  cat: string,
  mode: 'description' | 'name',
  provider: string
): Promise<{ ru: string; en: string; ka: string }> {
  
  // Если нам нужно перевести ИМЯ, мы не используем ИИ, сразу используем Google Translate.
  // Это быстрее, дешевле и надежнее.
  if (mode === 'name') {
    const [en, ka] = await Promise.all([
      translateText(name, 'en'),
      translateText(name, 'ka')
    ]);
    return { ru: name, en, ka };
  }

  // Если нужно сгенерировать ОПИСАНИЕ
  const prompt = buildDescriptionPrompt(name, cat);
  let textRu = '';

  if (provider === 'yandex') {
    if (!YANDEX_API_KEY) throw new Error('YANDEX_API_KEY not set');
    try {
      textRu = await generateWithYandex(prompt);
    } catch (e: any) {
      console.warn('Yandex failed, falling back to Gemini:', e?.message);
      if (!GEMINI_API_KEY) throw e;
      textRu = await generateWithGemini(prompt);
    }
  } else {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    try {
      textRu = await generateWithGemini(prompt);
    } catch (e: any) {
      console.warn('Gemini failed, falling back to Yandex:', e?.message);
      if (!YANDEX_API_KEY) throw e;
      textRu = await generateWithYandex(prompt);
    }
  }

  // Получили текст на русском. Теперь переводим на en и ka.
  const cleanRu = textRu.replace(/```.*?```/gs, '').trim(); // очищаем от случайного маркдауна
  
  const [en, ka] = await Promise.all([
    translateText(cleanRu, 'en'),
    translateText(cleanRu, 'ka')
  ]);

  return { ru: cleanRu.slice(0, 500), en: en.slice(0, 500), ka: ka.slice(0, 500) };
}

// ─── API HANDLER ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { ids, field, provider = 'yandex', batch_size = 50 } = await req.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Нет ids' }, { status: 400 });
  }

  const results: { id: number; ok: boolean; error?: string }[] = [];
  const chunk = ids.slice(0, batch_size);

  for (const id of chunk) {
    try {
      const rows = await sql`
        SELECT id, name_ru, name_en, name_ka, category_ru, sub_category_ru,
               description_ru, description_en, description_ka
        FROM products WHERE id = ${id} AND source = 'gorgia'
      `;
      if (!rows[0]) { results.push({ id, ok: false, error: 'not found' }); continue; }

      const p = rows[0];
      const name = (p.name_ru || p.name_en || p.name_ka) as string;
      const cat  = p.sub_category_ru
        ? `${p.category_ru} / ${p.sub_category_ru}`
        : (p.category_ru as string || '');

      if (field === 'description') {
        const desc = await generate(name, cat, 'description', provider);
        await sql`
          UPDATE products SET
            description_ru = COALESCE(NULLIF(description_ru,''), ${desc.ru}),
            description_en = COALESCE(NULLIF(description_en,''), ${desc.en}),
            description_ka = COALESCE(NULLIF(description_ka,''), ${desc.ka}),
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
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      results.push({ id, ok: false, error: String(e) });
    }
  }

  const ok  = results.filter(r => r.ok).length;
  const err = results.filter(r => !r.ok).length;
  return NextResponse.json({ ok, err, results });
}