import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { aiChat } from '@/lib/ai';
import { googleTranslate, googleTranslateBoth } from '@/lib/google-translate';

/**
 * Массовое заполнение товаров из списка в админке.
 *
 *   description — AI пишет русский текст, Google переводит на EN и KA;
 *   name_en / name_ka — только Google.
 *
 * Раньше сюда слали все выбранные товары одним запросом, и сервер
 * обрабатывал их по очереди: 50 описаний по несколько секунд каждое —
 * гарантированный 504. Теперь клиент шлёт маленькие порции, а сервер
 * на всякий случай режет лишнее: не больше MAX за вызов.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX = { description: 3, name_en: 25, name_ka: 25 } as const;

function prompt(name: string, cat: string): string {
  return [
    'Ты пишешь описания товаров для интернет-магазина BAZARI ARA в Тбилиси.',
    `Товар: ${name}`,
    cat ? `Категория: ${cat}` : '',
    'Напиши описание на русском, 80–140 слов, 2–3 абзаца: что это, чем отличается,',
    'как использовать. Без выдуманных фактов, восклицаний и штампов.',
    'Верни только текст, без заголовка, кавычек и Markdown.',
  ].filter(Boolean).join('\n');
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { ids, field } = await req.json() as { ids: number[]; field: keyof typeof MAX };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Нет ids' }, { status: 400 });
  }
  if (!(field in MAX)) {
    return NextResponse.json({ error: `Неизвестное поле: ${field}` }, { status: 400 });
  }

  const chunk = ids.slice(0, MAX[field]);
  const results: { id: number; ok: boolean; skipped?: boolean; error?: string }[] = [];

  for (const id of chunk) {
    try {
      const [p] = await sql`
        SELECT id, name_ru, name_en, name_ka, category, sub_category,
               description_ru, description_en, description_ka
        FROM products WHERE id = ${id}
      `;
      if (!p) { results.push({ id, ok: false, error: 'не найден' }); continue; }

      const name = String(p.name_ru || p.name_en || p.name_ka || '');
      if (!name) { results.push({ id, ok: false, error: 'нет названия' }); continue; }

      if (field === 'description') {
        // Заполненное руками не перезаписываем
        if (p.description_ru && p.description_en && p.description_ka) {
          results.push({ id, ok: true, skipped: true }); continue;
        }
        const cat = p.sub_category ? `${p.category} / ${p.sub_category}` : String(p.category || '');
        const ru = p.description_ru || (await aiChat({
          system: 'Ты копирайтер интернет-магазина. Пишешь по-русски, по делу.',
          user: prompt(name, cat), temperature: 0.4, maxTokens: 6000,
        })).text.trim();
        const { en, ka } = await googleTranslateBoth(ru);
        await sql`
          UPDATE products SET
            description_ru = COALESCE(NULLIF(description_ru, ''), ${ru}),
            description_en = COALESCE(NULLIF(description_en, ''), ${en}),
            description_ka = COALESCE(NULLIF(description_ka, ''), ${ka}),
            updated_at = NOW()
          WHERE id = ${id}
        `;
      } else {
        const lang = field === 'name_en' ? 'en' : 'ka';
        if (p[field]) { results.push({ id, ok: true, skipped: true }); continue; }
        const tr = await googleTranslate(name, lang);
        if (field === 'name_en') await sql`UPDATE products SET name_en = ${tr}, updated_at = NOW() WHERE id = ${id}`;
        else                     await sql`UPDATE products SET name_ka = ${tr}, updated_at = NOW() WHERE id = ${id}`;
      }
      results.push({ id, ok: true });
    } catch (e: any) {
      results.push({ id, ok: false, error: e?.message || String(e) });
    }
  }

  return NextResponse.json({
    ok: results.filter((r) => r.ok).length,
    err: results.filter((r) => !r.ok).length,
    processed: chunk.length,
    results,
  });
}
