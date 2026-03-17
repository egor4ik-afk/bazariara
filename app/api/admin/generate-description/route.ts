import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const YANDEX_FOLDER  = process.env.YANDEX_FOLDER || 'b1gcr5m4ptniag2qpsqm';
const YANDEX_API_KEY = process.env.YANDEX_API_KEY || '';
const YANDEX_MODEL   = 'yandexgpt-5.1/latest';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-002'];

async function translateWithGemini(name: string, cat: string, mode: 'description' | 'name') {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const prompt = mode === 'description' ? buildDescriptionPrompt(name, cat) : buildNamePrompt(name);

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

async function translateWithYandex(name: string, cat: string, mode: 'description' | 'name'): Promise<{ ru: string; en: string; ka: string }> {
  const client = new OpenAI({
    apiKey: YANDEX_API_KEY,
    baseURL: 'https://ai.api.cloud.yandex.net/v1',
    defaultHeaders: { 'OpenAI-Project': YANDEX_FOLDER },
  });
  const prompt = mode === 'description' ? buildDescriptionPrompt(name, cat) : buildNamePrompt(name);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await client.responses.create({
      model: `gpt://${YANDEX_FOLDER}/${YANDEX_MODEL}`,
      instructions: 'You are a product copywriter. Return only valid JSON. No markdown, no extra text.',
      input: prompt,
      temperature: 0.3,
      max_output_tokens: 5000,
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

function parseJson(text: string): { ru: string; en: string; ka: string } {
  let clean = text.replace(/```json\s*|\s*```/g, '').trim();
  
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found in response');
  clean = match[0];

  // Убираем управляющие символы
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Заменяем буквальные \n \r \t на пробел — НЕ через regex на строки,
  // а напрямую в сыром тексте до парсинга
  clean = clean.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\t/g, ' ');

  try {
    const parsed = JSON.parse(clean);
    return {
      ru: String(parsed.ru || '').slice(0, 500),
      en: String(parsed.en || '').slice(0, 500),
      ka: String(parsed.ka || '').slice(0, 500),
    };
  } catch {
    const get = (key: string) => {
      const m = clean.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\]|\\.)*)"`));
      return m ? m[1] : '';
    };
    return {
      ru: get('ru').slice(0, 500),
      en: get('en').slice(0, 500),
      ka: get('ka').slice(0, 500),
    };
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

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const {
    name_ru, name_en, name_ka,
    category_ru, sub_category_ru,
    provider = 'gemini',
    mode = 'description',  // 'description' | 'name'
  } = await req.json();

  const name = name_ru || name_en || name_ka;
  if (!name) return NextResponse.json({ error: 'Нет названия товара' }, { status: 400 });

  const cat = sub_category_ru ? `${category_ru} / ${sub_category_ru}` : (category_ru || '');

  try {
    let result;
    if (provider === 'yandex') {
      if (!YANDEX_API_KEY) return NextResponse.json({ error: 'YANDEX_API_KEY not set' }, { status: 500 });
      result = await translateWithYandex(name, cat, mode);
    } else {
      if (!GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
      result = await translateWithYandex(name, cat, mode);
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('Generate description error:', e?.message || e);
    return NextResponse.json({ error: e?.message || String(e), status: e?.status }, { status: 500 });
  }
}
