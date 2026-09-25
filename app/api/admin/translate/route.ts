import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { aiChat } from '@/lib/ai';

/**
 * Перевод одного фрагмента RU → EN или KA через OpenCode.
 *
 * Роут переводит ОДИН фрагмент за вызов. Длинные тексты режет на куски
 * клиент (lib/translate-client.ts): целая статья в один запрос не
 * уложилась бы в лимит времени функции, а грузинский вдобавок в 3–4 раза
 * «дороже» по токенам, чем русский, и ответ обрывался бы на середине.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANG = {
  en: 'English',
  ka: 'Georgian (ქართული, Mkhedruli script)',
} as const;

type Kind = 'title' | 'plain' | 'markdown' | 'seo_title' | 'seo_description';

const RULES: Record<Kind, string> = {
  title:
    'This is a title. Keep it short and natural. No trailing period.',
  seo_title:
    'This is an SEO title for a search results page. Keep it under 47 characters, key phrase first. No brand name, no trailing period.',
  seo_description:
    'This is a meta description for search results. Keep it between 120 and 160 characters, natural and specific.',
  plain:
    'This is plain prose. Keep paragraph breaks exactly as in the source.',
  markdown:
    'This is Markdown. Translate only human-readable text. Keep EXACTLY as is: ' +
    'markdown syntax (#, **, -, >, numbered lists), link URLs in [text](url) — translate only the text part, ' +
    'image lines ![...](url), lines like @video[...], blank lines and line breaks.',
};

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { text, to, kind = 'plain' } = await req.json() as { text: string; to: 'en' | 'ka'; kind?: Kind };

  if (!text || !text.trim()) return NextResponse.json({ text: '' });
  if (to !== 'en' && to !== 'ka') {
    return NextResponse.json({ error: 'to должен быть en или ka' }, { status: 400 });
  }
  if (text.length > 6000) {
    return NextResponse.json({ error: 'Фрагмент длиннее 6000 символов — режьте на куски' }, { status: 413 });
  }

  const system = [
    `You are a professional translator from Russian into ${LANG[to]}.`,
    'The text is from a Georgian food and travel shop: honey, tea, wine, spices, farms, regions of Georgia.',
    'Use the established English/Georgian names of Georgian places and dishes',
    '(Кахетия → Kakheti / კახეთი, чурчхела → churchkhela / ჩურჩხელა, ткемали → tkemali / ტყემალი, Мцхета → Mtskheta / მცხეთა).',
    'Brand and farm names written in Latin letters stay unchanged (CH’VENTAN, BAZARI ARA).',
    'Prices, numbers and units stay the same.',
    RULES[kind],
    'Output ONLY the translation. No quotes around it, no comments, no explanations, no markdown fences.',
  ].join(' ');

  try {
    // Грузинский в токенах в 3–4 раза длиннее русского — запас по лимиту
    const maxTokens = Math.min(8000, Math.ceil(text.length * (to === 'ka' ? 3 : 1.5)) + 300);
    const r = await aiChat({ system, user: text, temperature: 0.2, maxTokens });

    let out = r.text.trim();
    // Модели иногда оборачивают ответ в кавычки или ```-фенсы — снимаем
    out = out.replace(/^```(?:\w+)?\s*/, '').replace(/\s*```$/, '');
    if (kind !== 'markdown' && /^["«“].*["»”]$/s.test(out)) out = out.slice(1, -1).trim();

    return NextResponse.json({ text: out, meta: { model: r.model, ms: r.ms } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}
