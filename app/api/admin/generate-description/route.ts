import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { aiChat, AI_MODELS } from '@/lib/ai';
import { googleTranslate, googleTranslateBoth } from '@/lib/google-translate';

/**
 * Генерация описания товара и перевод названий.
 *
 * AI пишет ТОЛЬКО русский текст, английский и грузинский делает Google.
 *
 * Раньше модель просили вернуть все три языка одним JSON. Это было
 * медленно (грузинский в токенах в 3–4 раза длиннее русского), и ответ
 * обрывался посреди JSON — «No JSON found in response». Русский абзац
 * модель пишет за несколько секунд, Google переводит за секунду.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

function descriptionPrompt(name: string, cat: string): string {
  return [
    'Ты пишешь описания товаров для интернет-магазина BAZARI ARA в Тбилиси:',
    'грузинские фермерские продукты, подарки, товары для туризма.',
    '',
    `Товар: ${name}`,
    cat ? `Категория: ${cat}` : '',
    '',
    'Напиши описание на русском, 80–140 слов, 2–3 абзаца.',
    'Конкретно: что это, чем отличается, как использовать или с чем подать.',
    'Без выдуманных фактов: не указывай вес, состав, регион или производителя,',
    'если их нет в названии. Без восклицательных знаков и слов «уникальный»,',
    '«идеальный», «незабываемый».',
    '',
    'Верни только текст описания. Без заголовка, кавычек и Markdown.',
  ].filter((l) => l !== null).join('\n');
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  return NextResponse.json({
    ai: { key: Boolean(process.env.OPENCODE_API_KEY), models: AI_MODELS() },
    translate: 'google',
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { name_ru, name_en, name_ka, category, sub_category, mode = 'description' } = await req.json();
  const name = name_ru || name_en || name_ka;
  if (!name) return NextResponse.json({ error: 'Нет названия' }, { status: 400 });

  try {
    // Перевод названия — только Google, AI тут не нужен
    if (mode === 'name') {
      const started = Date.now();
      const { en, ka } = await googleTranslateBoth(name);
      return NextResponse.json({
        ru: name, en, ka,
        meta: { provider: 'google', model: 'translate', ms: Date.now() - started },
      });
    }

    const cat = sub_category ? `${category} / ${sub_category}` : (category || '');
    const r = await aiChat({
      system: 'Ты копирайтер интернет-магазина. Пишешь по-русски, по делу, без штампов.',
      user: descriptionPrompt(name, cat),
      temperature: 0.4,
      maxTokens: 6000,
    });

    const ru = r.text.replace(/```[\s\S]*?```/g, '').replace(/^["«]|["»]$/g, '').trim();
    const [en, ka] = await Promise.all([googleTranslate(ru, 'en'), googleTranslate(ru, 'ka')]);

    return NextResponse.json({
      ru, en, ka,
      meta: { provider: 'opencode', model: r.model, ms: r.ms, skipped: r.skipped, translate: 'google' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}
