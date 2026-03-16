import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { name_ru, name_en, name_ka, category_ru, sub_category_ru } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  const name = name_ru || name_en || name_ka;
  if (!name) return NextResponse.json({ error: 'Нет названия товара' }, { status: 400 });

  const cat = sub_category_ru ? `${category_ru} / ${sub_category_ru}` : category_ru;

  const prompt = `You are a product copywriter for an online store in Georgia (country).
Write a short, natural product description (2-3 sentences, max 300 chars each) for:

Product: ${name}
Category: ${cat}

Return ONLY a valid JSON object with exactly these keys:
{
  "ru": "описание на русском",
  "en": "description in english",
  "ka": "აღწერა ქართულად"
}

No markdown, no extra text, just the JSON.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = (response.text || '').trim();
    text = text.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(text);

    return NextResponse.json({
      ru: String(parsed.ru || '').slice(0, 500),
      en: String(parsed.en || '').slice(0, 500),
      ka: String(parsed.ka || '').slice(0, 500),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}