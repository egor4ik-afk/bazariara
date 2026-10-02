/**
 * fix-products-translations.ts — чинит переводы товаров: грузинский и английский.
 *
 * Обобщение fix-products-en.ts на оба языка и на обрывы перевода.
 * Если fix-products-en.ts уже лежит в репозитории, его можно удалить:
 * этот скрипт делает всё то же самое и больше.
 *
 * Запуск из корня проекта:
 *   npx tsx fix-products-translations.ts                   — грузинский, предпросмотр
 *   npx tsx fix-products-translations.ts --lang=en         — английский
 *   npx tsx fix-products-translations.ts --ids=11565,718   — только указанные товары
 *   npx tsx fix-products-translations.ts --skip-ids=9459,9460 — пропустить указанные
 *
 * Пропускать имеет смысл товары, у которых название целиком состоит из
 * бренда и модели: Power bank HOCO J101, Bestway «Kahawai». Их не переводят,
 * и отсутствие грузинских букв там — норма, а не ошибка.
 *   npx tsx fix-products-translations.ts --apply           — записать в базу
 *
 * Внимание: скрипт работает с базой из локального .env. Если на Vercel
 * в DATABASE_URL другая база или ветка Neon, он обновит не ту.
 *
 * ───────────────────────────────────────────────────────────────────────
 * ГЛАВНОЕ ПРО ГРУЗИНСКИЙ: СНАЧАЛА ВЫЧИТКА, ПОТОМ ЗАПИСЬ
 *
 * Английский перевод владелец магазина может проверить сам. Грузинский —
 * скорее всего нет. Автоматический перевод на язык, которого никто в
 * команде не читает, это ровно тот механизм, которым нынешние ошибки и
 * появились: Google отвечал, ответ записывался, проверить было некому.
 *
 * Поэтому в режиме предпросмотра скрипт пишет файл
 * products-<lang>-review.md — таблицу «русский / что в базе сейчас /
 * что предлагается». Этот файл отдаётся носителю языка, он правит прямо
 * в нём, и только потом запускается --apply.
 *
 * Речь о 12 товарах. Носителю это полчаса работы, и результат будет
 * заведомо лучше любого машинного перевода.
 * ───────────────────────────────────────────────────────────────────────
 *
 * ЧТО ЧИНИТ
 *   ru_in_*      кириллица в переводном поле (перевод сорвался,
 *                а исходный русский текст записался как результат)
 *   no_georgian  в name_ka нет ни одной грузинской буквы
 *   same_as_ru   перевод дословно совпал с оригиналом
 *   missing      перевода нет: покупателю подставляется русский текст
 *   truncated    перевод обрывается на полуслове
 *   too_short    перевод короче оригинала больше чем вдвое
 *
 * Последние два — следы второго бага из lib/google-translate.ts: текст
 * уходил в URL методом GET и обрезался по длине адреса. Для грузинского
 * это особенно заметно: грузинский текст обычно НЕ короче русского, так
 * что вдвое более короткий перевод почти наверняка обрублен.
 */

import 'dotenv/config';
import postgres from 'postgres';
import { writeFileSync } from 'node:fs';

type Lang = 'ka' | 'en';

const APPLY = process.argv.includes('--apply');
const LANG = ((process.argv.find((a) => a.startsWith('--lang=')) || '').split('=')[1] || 'ka') as Lang;
const IDS = (process.argv.find((a) => a.startsWith('--ids=')) || '').split('=')[1] || '';
const ONLY_IDS = IDS ? IDS.split(',').map((s) => Number(s.trim())).filter(Boolean) : [];
const SKIP = (process.argv.find((a) => a.startsWith('--skip-ids=')) || '').split('=')[1] || '';
const SKIP_IDS = new Set(SKIP ? SKIP.split(',').map((s) => Number(s.trim())).filter(Boolean) : []);

if (LANG !== 'ka' && LANG !== 'en') {
  console.error('--lang принимает только ka или en');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

/* ─────────────────────────────────────────────────────────────────────────
   ГЛОССАРИИ

   Звёздочка = любое русское окончание до трёх букв. Без неё глоссарий ловил
   бы только точную форму: «кахетинский» нашёлся бы, а «чурчхела кахетинская»
   уже нет, потому что в названиях слова стоят в разных падежах и родах.

   ГРУЗИНСКИЙ ГЛОССАРИЙ НУЖНО ПРОВЕРИТЬ НОСИТЕЛЮ. Написания собраны из
   общеупотребительных форм, четыре из них взяты прямо из промта в
   app/api/admin/translate/route.ts (კახეთი, ჩურჩხელა, ტყემალი, მცხეთა).
   Остальные правдоподобны, но подтверждения у меня нет. Это первое, что
   стоит показать носителю: ошибка в глоссарии размножится по всем товарам.
   ───────────────────────────────────────────────────────────────────────── */

const GLOSSARY_KA: Record<string, string> = {
  // ── еда и напитки ──
  'чурчхел*': 'ჩურჩხელა',
  'тклапи': 'ტკლაპი',
  'ткемали': 'ტყემალი',
  'аджик*': 'აჯიკა',
  'сванск* сол*': 'სვანური მარილი',
  'уцхо-сунели': 'უცხო სუნელი',
  'хмели-сунели': 'ხმელი სუნელი',
  'сулугуни': 'სულგუნი',
  'мацони': 'მაწონი',
  'надуги': 'ნადუღი',
  'дамбалхачо': 'დამბალხაჭო',
  'гозинаки': 'გოზინაყი',
  'мчади': 'მჭადი',
  'хачапури': 'ხაჭაპური',
  'хинкали': 'ხინკალი',
  'чач*': 'ჭაჭა',
  'квеври': 'ქვევრი',

  // ── сорта и наименования вин ──
  'саперави': 'საფერავი',
  'ркацители': 'რქაწითელი',
  'мцване': 'მწვანე',
  'хихви': 'ხიხვი',
  'чинури': 'ჩინური',
  'тавквери': 'თავკვერი',
  'шавкапито': 'შავკაპიტო',
  'цоликаури': 'ცოლიკოური',
  'чхавери': 'ჩხავერი',
  'киндзмараули': 'ქინძმარაული',
  'мукузани': 'მუკუზანი',
  'цинандали': 'წინანდალი',
  'ахашени': 'ახაშენი',
  'хванчкара': 'ხვანჭკარა',

  // ── регионы, города, прилагательные ──
  'кахетинск*': 'კახური',
  'кахети*': 'კახეთი',
  'имеретинск*': 'იმერული',
  'имерети*': 'იმერეთი',
  'сванети*': 'სვანეთი',
  'мегрельск*': 'მეგრული',
  'самегрело': 'სამეგრელო',
  'гурийск*': 'გურული',
  'гури*': 'გურია',
  'рач*': 'რაჭა',
  'аджарск*': 'აჭარული',
  'аджари*': 'აჭარა',
  'мцхет*': 'მცხეთა',
  'тбилиси': 'თბილისი',
  'кварели': 'ყვარელი',
  'телави': 'თელავი',
  'сигнахи': 'სიღნაღი',
  'грузинск*': 'ქართული',
  'грузия': 'საქართველო',
};

const GLOSSARY_EN: Record<string, string> = {
  'чурчхел*': 'churchkhela',
  'тклапи': 'tklapi',
  'пастил* из ткемали': 'tkemali fruit leather',
  'ткемали': 'tkemali',
  'мегрельск* аджик*': 'Megrelian ajika',
  'аджик*': 'ajika',
  'сванск* сол*': 'Svanetian salt',
  'уцхо-сунели': 'utskho-suneli',
  'хмели-сунели': 'khmeli-suneli',
  'сулугуни': 'sulguni',
  'мацони': 'matsoni',
  'надуги': 'nadugi',
  'дамбалхачо': 'dambalkhacho',
  'имеретинск* сыр': 'Imeretian cheese',
  'гозинаки': 'gozinaki',
  'бакмази': 'bakmazi',
  'мчади': 'mchadi',
  'хачапури': 'khachapuri',
  'хинкали': 'khinkali',
  'чач*': 'chacha',
  'квеври': 'qvevri',
  'янтарн* вино': 'amber wine',
  'саперави': 'Saperavi',
  'ркацители': 'Rkatsiteli',
  'мцване': 'Mtsvane',
  'хихви': 'Khikhvi',
  'чинури': 'Chinuri',
  'тавквери': 'Tavkveri',
  'шавкапито': 'Shavkapito',
  'цоликаури': 'Tsolikouri',
  'чхавери': 'Chkhaveri',
  'киндзмараули': 'Kindzmarauli',
  'мукузани': 'Mukuzani',
  'цинандали': 'Tsinandali',
  'ахашени': 'Akhasheni',
  'хванчкара': 'Khvanchkara',
  'атенури': 'Atenuri',
  'акациев* мёд': 'acacia honey',
  'каштанов* мёд': 'chestnut honey',
  'соснов* мёд': 'pine honey',
  'цветочн* мёд': 'wildflower honey',
  'крем-мёд': 'creamed honey',
  'крем мёд': 'creamed honey',
  'кахетинск*': 'Kakhetian',
  'кахети*': 'Kakheti',
  'имеретинск*': 'Imeretian',
  'имерети*': 'Imereti',
  'сванети*': 'Svaneti',
  'мегрельск*': 'Megrelian',
  'самегрело': 'Samegrelo',
  'джавахети*': 'Javakheti',
  'самцхе': 'Samtskhe',
  'гурийск*': 'Gurian',
  'гури*': 'Guria',
  'рач*': 'Racha',
  'картли': 'Kartli',
  'аджарск*': 'Adjarian',
  'аджари*': 'Adjara',
  'мцхет*': 'Mtskheta',
  'тбилиси': 'Tbilisi',
  'кварели': 'Kvareli',
  'телави': 'Telavi',
  'сигнахи': 'Sighnaghi',
  'грузинск*': 'Georgian',
  'грузи*': 'Georgia',
  'повербанк*': 'power bank',
  'термобель*': 'thermal underwear',
  'дождевик*': 'raincoat',
  'спальн* мешок': 'sleeping bag',
  'мангал*': 'charcoal grill',
  'шампур*': 'skewer',
  'цалами': 'tsalami vine cuttings',
  'разжигатель огня': 'firestarter',
  'древесн* угол*': 'charcoal',
};

const GLOSSARY = LANG === 'ka' ? GLOSSARY_KA : GLOSSARY_EN;
const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

const CYR = /[А-Яа-яЁё]/;
const LAT = /[A-Za-z]/;
const GEO = /[\u10A0-\u10FF]/;

function cyrShare(s: string): number {
  const letters = (s.match(/[А-Яа-яЁёA-Za-z\u10A0-\u10FF]/g) || []).length;
  if (!letters) return 0;
  return (s.match(/[А-Яа-яЁё]/g) || []).length / letters;
}

function looksTruncated(s: string): boolean {
  const t = s.trim();
  if (t.length < 40) return false;
  if (/[.!?»"')\]]$/.test(t)) return false;
  return (t.split(/\s+/).pop() || '').length >= 3;
}

/** Термин глоссария -> регулярка. Звёздочка = русское окончание до трёх букв. */
function termRegExp(term: string): RegExp {
  const body = term
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[а-яё]{0,3}');
  // Границы по буквам: «рач*» не должно срабатывать внутри слова «врач»
  return new RegExp(`(?<![а-яёa-z])${body}(?![а-яё])`, 'gi');
}

/* Литералы, которые переводить нельзя ни при каких условиях.

   Причина конкретная: скрипт от стороннего ассистента перевёл
   «Power bank HOCO J101 10000 mAH» как «Power bank HOCO J122 10000 mAh».
   Номер модели переписался на другой. Покупатель, который сверит
   артикул перед покупкой, решит, что ему продают не тот товар.

   Поэтому до перевода прячем: содержимое кавычек, коды моделей вида
   J101 или J101A и ёмкости в mAh. Кириллицу в кавычках не трогаем —
   иначе она вернётся в текст и провалит проверку на язык. */
const LITERALS: { re: RegExp; keep?: (m: string) => boolean }[] = [
  { re: /"[^"\n]{1,40}"/g, keep: (m) => !/[А-Яа-яЁё]/.test(m) },
  { re: /\b[A-Z]{1,4}\d{2,}[A-Z]?\b/g },
  { re: /\b\d[\d\s.,]*\s?mAh\b/gi },
];

function protect(text: string): { out: string; map: string[] } {
  let out = text;
  const map: string[] = [];

  for (const { re, keep } of LITERALS) {
    out = out.replace(re, (m) => {
      if (keep && !keep(m)) return m;
      const i = map.length;
      map.push(m);
      return `@@${i}@@`;
    });
  }

  for (const term of TERMS) {
    const re = termRegExp(term);
    if (!re.test(out)) continue;
    re.lastIndex = 0;
    const i = map.length;
    map.push(GLOSSARY[term]);
    out = out.replace(re, `@@${i}@@`);
  }
  return { out, map };
}

/* Прилагательные от регионов. В русском они обычно идут после существительного
   («чурчхела кахетинская»), в английском — перед ним. Переставить это должен
   был бы Google, но оба слова закрыты метками, и он их не видит.
   Для грузинского перестановка не нужна: там порядок совпадает с русским. */
const REGION_ADJ = 'Kakhetian|Imeretian|Megrelian|Gurian|Adjarian|Svanetian|Kartlian|Georgian';
const NO_SWAP = /^(from|of|in|with|and|the|a|an|for|to|by|on|at)$/i;

function reorderAdjectives(s: string): string {
  const re = new RegExp(`\\b([A-Za-z][A-Za-z-]*) (${REGION_ADJ})\\b`, 'g');
  const once = (x: string) => x.replace(re, (m, noun, adj) => (NO_SWAP.test(noun) ? m : `${adj} ${noun}`));
  return once(once(s));
}

function restore(text: string, map: string[], isName: boolean): { out: string; ok: boolean } {
  const out = text.replace(/@\s*@\s*(\d+)\s*@\s*@/g, (_m, n) => map[Number(n)] ?? `@@${n}@@`);
  const ok = !/@\s*@\s*\d+\s*@\s*@/.test(out);
  const fixed = isName && LANG === 'en' ? reorderAdjectives(out) : out;
  return { out: fixed, ok };
}

/* ── Google Translate, тот же эндпоинт, что в lib/google-translate.ts ── */
async function gt(text: string): Promise<string> {
  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${LANG}&dt=t`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ q: text }).toString(),
      cache: 'no-store',
    },
  );
  if (!res.ok) throw new Error(`Google Translate ответил ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.[0])) throw new Error('Google Translate вернул неожиданный ответ');
  return data[0].map((seg: any) => seg?.[0] ?? '').join('');
}

/** Перевод с глоссарием и проверкой. Бросает исключение, если результат плохой. */
async function translate(ru: string, isName: boolean): Promise<string> {
  if (ru.length > 4000) throw new Error(`исходный текст ${ru.length} символов — режьте вручную`);

  const { out: masked, map } = protect(ru);
  const raw = await gt(masked);
  const { out, ok } = restore(raw, map, isName);

  if (!ok) throw new Error('метки глоссария не восстановились');
  const res = out.trim();

  if (!res) throw new Error('пустой ответ');
  if (CYR.test(res)) throw new Error(`осталась кириллица: "${res.slice(0, 60)}"`);
  if (res === ru.trim()) throw new Error('перевод совпал с оригиналом');
  if (LANG === 'ka' && !GEO.test(res)) throw new Error(`нет грузинских букв: "${res.slice(0, 60)}"`);
  if (LANG === 'en' && !LAT.test(res)) throw new Error('нет латиницы');
  // Грузинский обычно не короче русского; английский примерно такой же.
  // Вдвое более короткий результат — почти наверняка обрыв.
  if (res.length * 2 < ru.trim().length) {
    throw new Error(`подозрительно коротко: ${res.length} против ${ru.trim().length} в оригинале`);
  }
  return res;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { id: number; field: string; reason: string; ru: string; before: string; after?: string };

async function main() {
  const nameCol = LANG === 'ka' ? 'name_ka' : 'name_en';
  const descCol = LANG === 'ka' ? 'description_ka' : 'description_en';

  const rows = ONLY_IDS.length
    ? await sql`SELECT id, name, name_ru, name_en, name_ka,
                       description, description_ru, description_en, description_ka
                FROM products WHERE id = ANY(${ONLY_IDS}) ORDER BY id`
    : await sql`SELECT id, name, name_ru, name_en, name_ka,
                       description, description_ru, description_en, description_ka
                FROM products ORDER BY id`;

  const targets: Row[] = [];

  for (const r of rows as any[]) {
    const pairs: { field: string; ru: string; cur: string; isName: boolean }[] = [
      { field: nameCol, ru: (r.name_ru || r.name || '').trim(), cur: (r[nameCol] || '').trim(), isName: true },
      { field: descCol, ru: (r.description_ru || r.description || '').trim(), cur: (r[descCol] || '').trim(), isName: false },
    ];

    if (SKIP_IDS.has(r.id)) continue;

    for (const p of pairs) {
      if (!p.ru) continue;
      let reason = '';

      if (!p.cur) reason = 'missing — перевода нет, покупателю подставляется русский текст';
      else if (cyrShare(p.cur) > 0.4) reason = 'кириллица в переводном поле';
      else if (p.cur === p.ru) reason = 'перевод совпадает с оригиналом';
      else if (LANG === 'ka' && !GEO.test(p.cur)) reason = 'нет ни одной грузинской буквы';
      else if (looksTruncated(p.cur)) reason = 'обрыв на полуслове';
      else if (p.cur.length * 2 < p.ru.length) reason = `вдвое короче оригинала (${p.cur.length} против ${p.ru.length})`;

      if (reason) targets.push({ id: r.id, field: p.field, reason, ru: p.ru, before: p.cur });
    }
  }

  console.log(`Язык: ${LANG === 'ka' ? 'грузинский' : 'английский'}`);
  console.log(`Товаров в выборке: ${rows.length}`);
  console.log(`Полей к исправлению: ${targets.length} в ${new Set(targets.map((t) => t.id)).size} товарах`);
  console.log(APPLY ? 'Режим: ЗАПИСЬ В БАЗУ\n' : 'Режим: предпросмотр, база не меняется\n');

  if (!targets.length) {
    console.log('Нечего исправлять.');
    await sql.end();
    return;
  }

  const ok: Row[] = [];
  const failed: Row[] = [];

  for (const t of targets) {
    try {
      t.after = await translate(t.ru, t.field.startsWith('name'));
      ok.push(t);
    } catch (e: any) {
      t.reason += ` | не переведено: ${e?.message || String(e)}`;
      failed.push(t);
    }
    await sleep(250); // не долбим бесплатный эндпоинт
  }

  for (const t of ok) {
    console.log(`#${t.id}  ${t.field}  (${t.reason})`);
    console.log(`   русский: ${t.ru.slice(0, 80)}`);
    console.log(`   было:    ${t.before ? t.before.slice(0, 80) : '(пусто)'}`);
    console.log(`   станет:  ${t.after!.slice(0, 80)}`);
  }

  if (failed.length) {
    console.log('\nНЕ УДАЛОСЬ — эти поля останутся как есть');
    console.log('─'.repeat(72));
    for (const t of failed) console.log(`#${t.id}  ${t.field}: ${t.reason}`);
    console.log('\nЭто не сбой скрипта, а защита: раньше такая ошибка молча');
    console.log('записывалась в базу. Теперь поле пропускается.');
  }

  console.log(`\nИтого: готово к записи ${ok.length}, пропущено ${failed.length}`);

  if (!APPLY) {
    // ── файл на вычитку ──
    const review = `products-${LANG}-review.md`;
    const lines = [
      `# Переводы товаров на ${LANG === 'ka' ? 'грузинский' : 'английский'} — на вычитку`,
      '',
      LANG === 'ka'
        ? 'Пожалуйста, проверьте колонку «Предлагается». Это машинный перевод с подстановкой'
        : 'Проверьте колонку «Предлагается».',
      LANG === 'ka'
        ? 'терминов из глоссария. Если формулировка неестественная — впишите правильную'
        : 'Если формулировка неестественная — впишите правильную прямо в таблицу.',
      LANG === 'ka' ? 'прямо в таблицу, в ту же ячейку.' : '',
      '',
      'Отдельно стоит проверить сам глоссарий в шапке fix-products-translations.ts:',
      'ошибка там размножится по всем товарам сразу.',
      '',
      ...(LANG === 'ka'
        ? [
            'ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ: падежи. Глоссарий подставляет одну форму слова.',
            '«Мёд из Рачи» даёт რაჭა в именительном, хотя по смыслу нужен родительный.',
            'Такие места придётся править руками — их немного, но они предсказуемы:',
            'ищите названия регионов после предлогов «из», «с», «от».',
            '',
          ]
        : []),
      '| ID | Поле | Проблема | Русский оригинал | Сейчас в базе | Предлагается |',
      '|---|---|---|---|---|---|',
      ...ok.map((t) =>
        `| ${t.id} | ${t.field} | ${t.reason} | ${esc(t.ru)} | ${esc(t.before) || '—'} | ${esc(t.after!)} |`,
      ),
      ...failed.map((t) =>
        `| ${t.id} | ${t.field} | ${t.reason} | ${esc(t.ru)} | ${esc(t.before) || '—'} | **нужен ручной перевод** |`,
      ),
    ];
    writeFileSync(review, lines.join('\n'), 'utf8');
    console.log(`\nФайл на вычитку: ${review}`);
    console.log('Отдайте его носителю языка, внесите правки и только потом запускайте --apply.');
    console.log('Записать как есть, без вычитки: npx tsx fix-products-translations.ts --lang=' + LANG + ' --apply');
    await sql.end();
    return;
  }

  // ── резервная копия перед записью ──
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backup = `products-${LANG}-backup-${stamp}.json`;
  writeFileSync(backup, JSON.stringify(ok.map(({ id, field, before }) => ({ id, field, before })), null, 2), 'utf8');
  console.log(`\nСтарые значения сохранены в ${backup}`);

  for (const t of ok) {
    if (t.field === 'name_ka') await sql`UPDATE products SET name_ka = ${t.after!}, updated_at = NOW() WHERE id = ${t.id}`;
    else if (t.field === 'description_ka') await sql`UPDATE products SET description_ka = ${t.after!}, updated_at = NOW() WHERE id = ${t.id}`;
    else if (t.field === 'name_en') await sql`UPDATE products SET name_en = ${t.after!}, updated_at = NOW() WHERE id = ${t.id}`;
    else await sql`UPDATE products SET description_en = ${t.after!}, updated_at = NOW() WHERE id = ${t.id}`;
  }

  console.log(`Записано: ${ok.length} полей.`);
  console.log('Прогоните check-products-text.ts ещё раз и откройте пару товаров на сайте.');
  await sql.end();
}

/** Экранирование для ячейки таблицы Markdown. */
function esc(s: string): string {
  return (s || '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').slice(0, 300);
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
