/**
 * sync-posts-i18n.ts — приводит английские и грузинские версии статей
 * в соответствие с русскими.
 *
 *   npx tsx sync-posts-i18n.ts                 — предпросмотр, база не меняется
 *   npx tsx sync-posts-i18n.ts --apply         — записать
 *   npx tsx sync-posts-i18n.ts --only=slug     — одна статья
 *
 * ЗАЧЕМ
 * Скрипты исправления статей (fix-*-post.ts) обновляли только русские поля:
 * title, body, seo_title, seo_description. Не трогали две вещи.
 *
 *  1. excerpt — подводку, которую показывает карточка на индексе блога.
 *     Отсюда «…центральной Грузии. Малая родина Сталина» без точки в
 *     карточке Шида-Картли: это старый excerpt. Новым становится
 *     seo_description, написанный в тех же скриптах.
 *
 *  2. title_en, title_ka, excerpt_*, body_* — переводы. Они либо пустые,
 *     и тогда на /en и /ka показывается русский текст, либо содержат
 *     старый перевод сломанной статьи. Второе хуже: статья считается
 *     переведённой, если заполнен title_<язык>, и Google индексирует
 *     старую версию со всеми ошибками, которые в русской уже исправлены.
 *
 * КАК ПЕРЕВОДИТСЯ
 * Текст режется на блоки по пустым строкам — ровно так же, как его режет
 * renderMarkdown на сайте. Заголовки, пункты списков и цитаты переводятся
 * без своих маркеров, маркеры возвращаются на место. Ссылки вынимаются
 * целиком: текст ссылки переводится отдельно, а адрес меняется с /ru/ на
 * /en/ или /ka/, чтобы из грузинской статьи ссылки вели на грузинский сайт.
 *
 * Глоссария здесь нет намеренно. В названиях товаров у Google нет контекста,
 * и глоссарий спасал. В статьях контекст есть, а подстановка готовых форм
 * ломает грузинскую грамматику: «из Рачи» превращается в именительный падеж.
 *
 * ПРОВЕРКА
 * Перед записью у каждой версии сверяется число заголовков H2 и ссылок
 * с русским оригиналом. Не совпало — язык этой статьи не записывается.
 * Плюс проверяется, что не осталось меток и что в грузинском есть
 * грузинские буквы. Отдельные русские слова (до трёх) допускаются
 * с предупреждением: лучше одно слово, чем вся статья по-русски.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Lang = 'en' | 'ka';
const LANGS: Lang[] = ['en', 'ka'];

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

const SLUGS = [
  'hayking-v-tbilisi-i-okrestnostyah-ekspertnyy-gid-po-marshrutam-snaryaz',
  'gruziya-bez-illyuziy-prakticheskiy-gid-dlya-turista-ekspata-i-chelovek',
  'tbilisi-istoriya-kultura-kuhnya-dostoprimechatelnosti',
  'fermery-gruzii-s-chem-oni-boryutsya-pochemu-ih-produkty-stoit-vybirat-',
  'kahetiya-vinnyy-region-gruzii-telavi-vinodelni-dostoprimechatelnosti-i',
  'mtsheta-mtianeti-mtsheta-kazbegi-gudauri-i-istoricheskie-gornye-rayony',
  'samtshe-dzhavaheti-borzhomi-ahaltsihe-vardziya-i-gornye-ozera',
  'shida-kartli-gori-uplistsihe-ateni-i-maloizvestnyy-tsentr-gruzii',
  'kvemo-kartli-rustavi-dmanisi-bolnisi-i-maloizvestnyy-yug-gruzii',
  'adzharija-batumi-putevoditel',
];

const raw = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').trim();
if (!raw || raw.includes('user:password@host')) {
  console.error('\nDATABASE_URL не задан или содержит заглушку. Сначала: npx tsx check-db-connection.ts\n');
  process.exit(1);
}
const sql = postgres(raw, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

const CYR = /[А-Яа-яЁё]/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── Google Translate: тот же бесплатный эндпоинт, что в lib/google-translate.ts ── */
let calls = 0;
async function gt(text: string, tl: Lang): Promise<string> {
  if (!text.trim() || !CYR.test(text)) return text;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${tl}&dt=t`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ q: text }).toString(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data?.[0])) throw new Error('неожиданный ответ');
      calls++;
      if (calls % 25 === 0) process.stdout.write('.');
      await sleep(150);
      return data[0].map((s: any) => s?.[0] ?? '').join('');
    } catch (e) {
      if (attempt === 1) throw e;
      await sleep(1500);
    }
  }
  throw new Error('недостижимо');
}

/** Несколько коротких строк одним запросом; при расхождении — поштучно. */
async function gtMany(items: string[], tl: Lang): Promise<string[]> {
  const idx = items.map((s, i) => (CYR.test(s) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return items;
  const out = [...items];
  const joined = await gt(idx.map((i) => items[i]).join('\n'), tl);
  const parts = joined.split('\n');
  if (parts.length === idx.length) {
    idx.forEach((i, k) => (out[i] = parts[k].trim()));
  } else {
    for (const i of idx) out[i] = await gt(items[i], tl);
  }
  return out;
}

/* ── ссылки: адрес меняет язык, текст переводится ── */
function localizeUrl(url: string, tl: Lang): string {
  return url
    .replace(/^(https?:\/\/(?:www\.)?bazariara\.ge)\/(ru|en|ka)(?=\/|$)/, `$1/${tl}`)
    .replace(/^\/(ru|en|ka)(?=\/|$)/, `/${tl}`);
}

const LINK = /(!?)\[([^\]\n]*)\]\(([^)\s]+)\)/g;

async function translateInline(text: string, tl: Lang): Promise<string> {
  const links: { img: boolean; text: string; url: string }[] = [];
  const masked = text.replace(LINK, (_m, bang, t, u) => {
    const i = links.length;
    links.push({ img: bang === '!', text: t, url: u });
    return `@@L${i}@@`;
  });

  // Google обычно сохраняет **, но иногда теряет одну звёздочку из пары —
  // тогда жирный ломается на всю оставшуюся строку. Сверяем и при
  // расхождении переводим без выделения.
  const bold = (s: string) => (s.match(/\*\*/g) || []).length;
  let out = await gt(masked, tl);
  if (bold(out) !== bold(masked)) out = await gt(masked.replace(/\*\*/g, ''), tl);
  out = out.replace(/\*\*\s*([^*\n]+?)\s*\*\*/g, '**$1**');

  const texts = await gtMany(links.map((l) => l.text), tl);
  out = out.replace(/@\s*@\s*L\s*(\d+)\s*@\s*@/gi, (m, n) => {
    const l = links[Number(n)];
    if (!l) return m;
    return `${l.img ? '!' : ''}[${texts[Number(n)]}](${localizeUrl(l.url, tl)})`;
  });
  return out.trim();
}

/** Блок — то, что renderMarkdown считает одним элементом: заголовок, список, цитата или абзац. */
async function translateBlock(block: string, tl: Lang): Promise<string> {
  const h = block.match(/^(#{2,3} )([\s\S]*)$/);
  if (h) return h[1] + (await translateInline(h[2], tl));

  const lines = block.split('\n');
  if (lines.every((l) => /^([-*] |\d+\. )/.test(l))) {
    const out: string[] = [];
    for (const l of lines) {
      const m = l.match(/^([-*] |\d+\. )(.*)$/)!;
      out.push(m[1] + (await translateInline(m[2], tl)));
    }
    return out.join('\n');
  }

  if (lines.every((l) => l.startsWith('> '))) {
    return '> ' + (await translateInline(lines.map((l) => l.slice(2)).join(' '), tl));
  }

  return translateInline(block, tl);
}

async function translateBody(md: string, tl: Lang): Promise<string> {
  const blocks = md.trim().split(/\n{2,}/);
  const out: string[] = [];
  for (const b of blocks) out.push(await translateBlock(b, tl));
  return out.join('\n\n');
}

/* ── проверка ── */
function check(src: string, out: string, tl: Lang): { error?: string; warn?: string } {
  const h2 = (s: string) => (s.match(/^## /gm) || []).length;
  const lk = (s: string) => (s.match(/\]\(/g) || []).length;
  if (h2(src) !== h2(out)) return { error: `заголовков H2: ${h2(src)} в оригинале, ${h2(out)} в переводе` };
  if (lk(src) !== lk(out)) return { error: `ссылок: ${lk(src)} в оригинале, ${lk(out)} в переводе` };
  if (/@\s*@\s*L/i.test(out)) return { error: 'в тексте остались служебные метки' };
  if (tl === 'ka' && !/[\u10A0-\u10FF]/.test(out)) return { error: 'нет грузинских букв' };
  const cyr = out.match(/[А-Яа-яЁё]+/g) || [];
  if (cyr.length > 3) return { error: `осталось ${cyr.length} русских слов: ${cyr.slice(0, 5).join(', ')}` };
  if (cyr.length) return { warn: `русские слова: ${cyr.join(', ')}` };
  return {};
}

/* ── основной проход ── */
async function main() {
  const slugs = ONLY ? [ONLY] : SLUGS;
  const rows = await sql`
    SELECT id, slug, title, excerpt, body, seo_description
    FROM posts WHERE slug = ANY(${slugs}) ORDER BY id
  `;

  console.log(`\nСтатей найдено: ${rows.length} из ${slugs.length}`);
  console.log(APPLY ? 'Режим: ЗАПИСЬ В БАЗУ' : 'Режим: предпросмотр, база не меняется');
  const missing = slugs.filter((s) => !(rows as any[]).some((r) => r.slug === s));
  if (missing.length) console.log(`Не найдены: ${missing.join(', ')}`);
  console.log('Перевод идёт блоками, это займёт несколько минут.\n');

  const previewDir = join(tmpdir(), 'bazariara-posts-preview');
  if (!APPLY) mkdirSync(previewDir, { recursive: true });

  let written = 0;
  let failed = 0;

  for (const p of rows as any[]) {
    const excerptRu = String(p.seo_description || p.excerpt || '').trim();
    const excerptChanged = excerptRu && excerptRu !== String(p.excerpt || '').trim();

    console.log(`\n■ ${p.title}`);
    if (excerptChanged) console.log(`  excerpt ru: «${String(p.excerpt || '').slice(0, 60)}…» → из seo_description`);

    const result: Partial<Record<Lang, { title: string; excerpt: string; body: string }>> = {};

    for (const tl of LANGS) {
      process.stdout.write(`  ${tl}: `);
      try {
        const title = await translateInline(p.title, tl);
        const excerpt = excerptRu ? await translateInline(excerptRu, tl) : '';
        const body = await translateBody(p.body, tl);
        const c = check(p.body, body, tl);
        if (c.error) {
          console.log(` пропущено — ${c.error}`);
          failed++;
          continue;
        }
        result[tl] = { title, excerpt, body };
        console.log(` готово${c.warn ? ` (внимание: ${c.warn})` : ''}`);
        console.log(`      ${title}`);
        if (!APPLY) {
          writeFileSync(join(previewDir, `${p.slug}.${tl}.md`), `# ${title}\n\n_${excerpt}_\n\n${body}\n`, 'utf8');
        }
      } catch (e: any) {
        console.log(` ошибка перевода — ${e?.message || e}`);
        failed++;
      }
    }

    if (!APPLY) continue;

    await sql`UPDATE posts SET excerpt = ${excerptRu}, updated_at = NOW() WHERE id = ${p.id}`;
    if (result.en) {
      await sql`UPDATE posts SET title_en = ${result.en.title}, excerpt_en = ${result.en.excerpt},
                body_en = ${result.en.body} WHERE id = ${p.id}`;
      written++;
    }
    if (result.ka) {
      await sql`UPDATE posts SET title_ka = ${result.ka.title}, excerpt_ka = ${result.ka.excerpt},
                body_ka = ${result.ka.body} WHERE id = ${p.id}`;
      written++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`Запросов к переводчику: ${calls}`);
  if (APPLY) {
    console.log(`Записано языковых версий: ${written}, пропущено: ${failed}`);
    console.log('Откройте /ka/blog и /en/blog — карточки и статьи должны быть на своём языке.');
  } else {
    console.log(`Готово к записи: ${rows.length * 2 - failed}, не прошло проверку: ${failed}`);
    console.log(`Полные тексты для просмотра: ${previewDir}`);
    console.log('Записать: npx tsx sync-posts-i18n.ts --apply');
  }
  console.log('');
  await sql.end();
}

main().catch(async (e) => {
  console.error('\nОшибка:', e?.message || e);
  await sql.end().catch(() => {});
  process.exit(1);
});
