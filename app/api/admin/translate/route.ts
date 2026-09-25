import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { aiChat } from '@/lib/ai';
import { googleTranslate } from '@/lib/google-translate';

/**
 * Перевод для редакторов блога и производителей.
 *
 *   engine: 'google' (по умолчанию) — перевод Google, около секунды;
 *   engine: 'review'                 — AI вычитывает готовый перевод.
 *
 * Раньше переводил AI, и на длинной статье функция упиралась в лимит
 * времени Vercel — HTTP 504. Теперь черновик делает Google, а AI по
 * отдельной кнопке правит уже готовый текст: править короче, чем писать
 * заново, и это укладывается во время.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANG = { en: 'English', ka: 'Georgian (ქართული)' } as const;

type Kind = 'title' | 'plain' | 'markdown' | 'seo_title' | 'seo_description';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { text, to, kind = 'plain', engine = 'google', source } =
    await req.json() as { text: string; to: 'en' | 'ka'; kind?: Kind; engine?: 'google' | 'review'; source?: string };

  if (!text || !text.trim()) return NextResponse.json({ text: '' });
  if (to !== 'en' && to !== 'ka') {
    return NextResponse.json({ error: 'to должен быть en или ka' }, { status: 400 });
  }

  const started = Date.now();
  try {
    if (engine === 'google') {
      const out = await googleTranslate(text, to, kind === 'markdown');
      return NextResponse.json({ text: out, meta: { engine: 'google', ms: Date.now() - started } });
    }

    // ── AI-вычитка готового перевода ──
    if (text.length > 3000) {
      return NextResponse.json({ error: 'Фрагмент длиннее 3000 символов — режьте на куски' }, { status: 413 });
    }
    const system = [
      `You are an editor. You get a Russian original and its machine translation into ${LANG[to]}.`,
      'Fix mistranslations, unnatural phrasing and wrong terms. Keep the meaning and structure.',
      'Use the established names of Georgian places and foods',
      '(Kakheti / კახეთი, churchkhela / ჩურჩხელა, tkemali / ტყემალი, Mtskheta / მცხეთა).',
      'Keep Markdown, links, image lines and @video[...] lines exactly as they are.',
      'If the translation is already good, return it unchanged.',
      'Output ONLY the corrected translation. No comments, no quotes, no fences.',
    ].join(' ');
    const user = `RUSSIAN ORIGINAL:\n${source || '(not provided)'}\n\nTRANSLATION TO FIX:\n${text}`;

    const r = await aiChat({ system, user, temperature: 0.1, maxTokens: 6000 });
    const out = r.text.replace(/^```(?:\w+)?\s*/, '').replace(/\s*```$/, '').trim();
    return NextResponse.json({ text: out, meta: { engine: 'review', model: r.model, ms: r.ms } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}
