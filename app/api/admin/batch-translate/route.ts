import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const YANDEX_FOLDER  = process.env.YANDEX_FOLDER || 'b1gcr5m4ptniag2qpsqm';
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-002'];

function buildDescriptionPrompt(name: string, cat: string) {
  return `You are a product copywriter for an online store in Georgia (country).\
Write a short product description (2-3 sentences, max 200 chars each) for:\
Product: ${name}\
Category: ${cat}\
\
Return ONLY this JSON (no markdown, no newlines inside values):\
{"ru":"описание на русском","en":"description in english","ka":"აღწერა ქართულად"}`;
}

function buildNamePrompt(name: string) {
  return `Translate this product name into English and Georgian.\
Product name: ${name}\
\
Return ONLY this JSON (no markdown, no newlines inside values):\
{"ru":"${name}","en":"translation in english","ka":"თარგმანი ქართულად"}`;
}

function parseJson(text: string): { ru: string; en: string; ka: string } {
  let clean = text.replace(/```json\s*|\s*```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  clean = match[0];
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  clean = clean.replace(/"((?:[^"\\]|\\.)*)"/g, (m) => m.replace(/[\n\r\t]/g, ' '));

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
      return m ? m[1].replace(/\\n/g, ' ').replace(/\\t/g, ' ') : '';
    };
    return { ru: get('ru').slice(0, 500), en: get('en').slice(0, 500), ka: get('ka').slice(0, 500) };
  }
}

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

async function generateWithYandex(prompt: string): Promise<{ ru: string; en: string; ka: string }> {
  const client = new OpenAI({
    apiKey: YANDEX_API_KEY,
    baseURL: 'https://ai.api.cloud.yandex.net/v1',
    defaultHeaders: { 'OpenAI-Project': YANDEX_FOLDER },
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await client.responses.create({
      model: `gpt://${YANDEX_FOLDER}/yandexgpt-5.1/latest`,
      instructions: 'You are a product copywriter. Return only valid JSON. No markdown, no extra text.',
      input: prompt,
      temperature: 0.3,
      max_output_tokens: 4000,
    } as any);

    const raw = (response as any).output_text
      ?? (response as any).output?.[0]?.content?.[0]?.text
      ?? '';

    // Проверяем что грузинский текст не обрезан — ищем закрывающую }
    const hasCompleteJson = raw.includes('}');
    // Проверяем что ka не обрезан посередине слова
    const kaMatch = raw.match(/"ka"\s*:\s*"([^"]*)"/);
    const kaComplete = kaMatch ? !kaMatch[1].match(/[\u10D0-\u10FF]$/) || raw.includes('"}') : true;

    if (hasCompleteJson && kaComplete) {
      try {
        return parseJson(raw);
      } catch {
        console.warn(`Attempt ${attempt} parse failed, retrying...`);
      }
    } else {
      console.warn(`Attempt ${attempt} response truncated, retrying...`);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  throw new Error('Yandex returned truncated response after 3 attempts');
}

async function generateWithGemini(prompt: string): Promise<{ ru: string; en: string; ka: string }> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return parseJson(response.text || '');
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

async function generate(
  name: string,
  cat: string,
  mode: 'description' | 'name',
  provider: string
): Promise<{ ru: string; en: string; ka: string }> {
  const prompt = mode === 'description' ? buildDescriptionPrompt(name, cat) : buildNamePrompt(name);

  if (provider === 'yandex') {
    if (!YANDEX_API_KEY) throw new Error('YANDEX_API_KEY not set');
    try {
      return await generateWithYandex(prompt);
    } catch (e: any) {
      // Fallback to Gemini if Yandex fails
      console.warn('Yandex failed, falling back to Gemini:', e?.message);
      if (!GEMINI_API_KEY) throw e;
      return await generateWithGemini(prompt);
    }
  } else {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    try {
      return await generateWithGemini(prompt);
    } catch (e: any) {
      // Fallback to Yandex if Gemini fails
      console.warn('Gemini failed, falling back to Yandex:', e?.message);
      if (!YANDEX_API_KEY) throw e;
      return await generateWithYandex(prompt);
    }
  }
}

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
