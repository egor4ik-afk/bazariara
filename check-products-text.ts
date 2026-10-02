/**
 * check-products-text.ts — находит проблемы в текстах и переводах товаров.
 *
 * Скрипт ТОЛЬКО ЧИТАЕТ базу. Ничего не меняет, флага --apply у него нет.
 *
 * Запуск из корня проекта:
 *   npx tsx check-products-text.ts              — сводка по всем проблемам
 *   npx tsx check-products-text.ts --full       — полный список товаров
 *   npx tsx check-products-text.ts --type=ru_in_en   — только одна категория
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * Тексты товаров собраны автоматически, и в пайплайне было два бага,
 * которые уже исправлены в коде, но данные, записанные до исправления,
 * так и остались в базе. Оба описаны в шапке lib/google-translate.ts:
 *
 *  1. При сбое перевода старый код молча возвращал ИСХОДНЫЙ русский текст,
 *     и он сохранялся как перевод. В колонке name_en лежит кириллица.
 *     Это худший случай: поле заполнено, подстановка русского варианта
 *     не срабатывает, и англоязычный покупатель видит кириллицу без
 *     единого признака, что что-то не так.
 *
 *  2. Текст уходил в URL методом GET, и длинные описания обрезались
 *     по длине адреса. Перевод обрывается на середине фразы.
 *
 * Плюс особенности, багами не являющиеся, но влияющие на качество:
 *
 *  3. Названия товаров переводит только Google Translate, без вычитки.
 *     AI-редактура с правилами про грузинские названия (чурчхела,
 *     ткемали, Кахети) подключена к блогу и фермерам, но не к товарам.
 *     Для грузинской еды это заметно: Google не знает устоявшихся
 *     написаний и переводит буквально.
 *
 *  4. Описание AI пишет, зная только название и категорию. Если в
 *     названии нет веса, состава и региона, их не будет и в описании —
 *     это правильное ограничение, но означает, что описания общие.
 *
 * ЧТО ПРОВЕРЯЕТСЯ
 *   ru_in_en     кириллица в name_en или description_en
 *   ru_in_ka     кириллица в name_ka или description_ka
 *   no_georgian  в name_ka нет ни одной грузинской буквы
 *   same_as_ru   name_en дословно совпадает с name_ru
 *   truncated    перевод обрывается без знака препинания в конце
 *   too_short    перевод короче русского больше чем вдвое
 *   missing      перевода нет вовсе: покупатель увидит русский текст
 *   no_ru        нет русского названия или описания
 *   mixed_script кириллица и латиница внутри одного слова
 */

import 'dotenv/config';
import postgres from 'postgres';

const FULL = process.argv.includes('--full');
const ONLY = (process.argv.find((a) => a.startsWith('--type=')) || '').split('=')[1] || '';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

const CYR = /[А-Яа-яЁё]/;
const GEO = /[\u10A0-\u10FF]/;
const LAT = /[A-Za-z]/;

/** Доля кириллицы среди букв: отличает «одно слово по-русски» от «весь текст». */
function cyrShare(s: string): number {
  const letters = (s.match(/[А-Яа-яЁёA-Za-z\u10A0-\u10FF]/g) || []).length;
  if (!letters) return 0;
  return (s.match(/[А-Яа-яЁё]/g) || []).length / letters;
}

/** Обрыв на полуслове: нет завершающего знака и последнее слово длинное. */
function looksTruncated(s: string): boolean {
  const t = s.trim();
  if (t.length < 40) return false;
  if (/[.!?»"')\]]$/.test(t)) return false;
  const last = t.split(/\s+/).pop() || '';
  return last.length >= 3;
}

function mixedScriptWords(s: string): string[] {
  return (s.match(/\S+/g) || []).filter((w) => CYR.test(w) && LAT.test(w));
}

type Issue = { id: number; name: string; type: string; field: string; detail: string };

async function main() {
  const rows = await sql`
    SELECT id, external_id, category_key,
           name, name_ru, name_en, name_ka,
           description, description_ru, description_en, description_ka
    FROM products
    ORDER BY id
  `;

  console.log(`Товаров в базе: ${rows.length}\n`);

  const issues: Issue[] = [];
  const add = (r: any, type: string, field: string, detail: string) =>
    issues.push({ id: r.id, name: r.name_ru || r.name || '(без названия)', type, field, detail });

  for (const r of rows as any[]) {
    const ru = (r.name_ru || r.name || '').trim();
    const dru = (r.description_ru || r.description || '').trim();

    if (!ru) add(r, 'no_ru', 'name_ru', 'нет русского названия');
    if (!dru) add(r, 'no_ru', 'description_ru', 'нет русского описания');

    // ── английский ──
    const en = (r.name_en || '').trim();
    const den = (r.description_en || '').trim();

    if (!en) add(r, 'missing', 'name_en', 'нет перевода, покупатель увидит русское название');
    else {
      if (cyrShare(en) > 0.4) add(r, 'ru_in_en', 'name_en', `кириллица: "${en.slice(0, 70)}"`);
      if (ru && en === ru) add(r, 'same_as_ru', 'name_en', `дословно как по-русски: "${en.slice(0, 70)}"`);
      const mix = mixedScriptWords(en);
      if (mix.length) add(r, 'mixed_script', 'name_en', `смешанный алфавит: ${mix.slice(0, 3).join(', ')}`);
    }

    if (!den && dru) add(r, 'missing', 'description_en', 'нет перевода описания');
    else if (den) {
      if (cyrShare(den) > 0.4) add(r, 'ru_in_en', 'description_en', `кириллица: "${den.slice(0, 70)}…"`);
      if (looksTruncated(den)) add(r, 'truncated', 'description_en', `обрыв: "…${den.slice(-60)}"`);
      if (dru && den.length * 2 < dru.length)
        add(r, 'too_short', 'description_en', `${den.length} символов против ${dru.length} в оригинале`);
    }

    // ── грузинский ──
    const ka = (r.name_ka || '').trim();
    const dka = (r.description_ka || '').trim();

    if (!ka) add(r, 'missing', 'name_ka', 'нет перевода, покупатель увидит русское название');
    else {
      if (cyrShare(ka) > 0.4) add(r, 'ru_in_ka', 'name_ka', `кириллица: "${ka.slice(0, 70)}"`);
      else if (!GEO.test(ka)) add(r, 'no_georgian', 'name_ka', `ни одной грузинской буквы: "${ka.slice(0, 70)}"`);
    }

    if (!dka && dru) add(r, 'missing', 'description_ka', 'нет перевода описания');
    else if (dka) {
      if (cyrShare(dka) > 0.4) add(r, 'ru_in_ka', 'description_ka', `кириллица: "${dka.slice(0, 70)}…"`);
      else if (!GEO.test(dka)) add(r, 'no_georgian', 'description_ka', 'ни одной грузинской буквы');
      if (looksTruncated(dka)) add(r, 'truncated', 'description_ka', `обрыв: "…${dka.slice(-60)}"`);
      if (dru && dka.length * 2 < dru.length)
        add(r, 'too_short', 'description_ka', `${dka.length} символов против ${dru.length} в оригинале`);
    }
  }

  // ── сводка ──
  const order = ['ru_in_en', 'ru_in_ka', 'no_georgian', 'same_as_ru', 'truncated', 'too_short', 'missing', 'no_ru', 'mixed_script'];
  const titles: Record<string, string> = {
    ru_in_en:     'Русский текст в английских полях — покупатель видит кириллицу на /en',
    ru_in_ka:     'Русский текст в грузинских полях',
    no_georgian:  'В грузинском поле нет грузинских букв',
    same_as_ru:   'Английское название дословно совпадает с русским',
    truncated:    'Перевод обрывается на полуслове',
    too_short:    'Перевод вдвое короче оригинала',
    missing:      'Перевода нет: подставляется русский текст',
    no_ru:        'Нет исходного русского текста',
    mixed_script: 'Кириллица и латиница внутри одного слова',
  };

  console.log('СВОДКА');
  console.log('─'.repeat(70));
  for (const t of order) {
    const list = issues.filter((i) => i.type === t);
    if (!list.length) continue;
    const products = new Set(list.map((i) => i.id)).size;
    console.log(`${String(list.length).padStart(5)}  ${titles[t]}`);
    console.log(`       затронуто товаров: ${products}`);
  }
  if (!issues.length) console.log('Проблем не найдено.');
  console.log('─'.repeat(70));
  console.log(`Всего замечаний: ${issues.length}, товаров с замечаниями: ${new Set(issues.map((i) => i.id)).size} из ${rows.length}\n`);

  // ── подробности ──
  const show = ONLY ? issues.filter((i) => i.type === ONLY) : issues;
  const limit = FULL || ONLY ? show.length : Math.min(show.length, 40);

  if (show.length) {
    console.log(ONLY ? `ПОДРОБНО: ${titles[ONLY] || ONLY}` : 'ПЕРВЫЕ ЗАМЕЧАНИЯ');
    console.log('─'.repeat(70));
    for (const i of show.slice(0, limit)) {
      console.log(`#${i.id}  ${i.name.slice(0, 50)}`);
      console.log(`      [${i.type}] ${i.field}: ${i.detail}`);
    }
    if (limit < show.length) {
      console.log(`\n… и ещё ${show.length - limit}. Полный список: --full, одна категория: --type=ru_in_en`);
    }
  }

  console.log('\nЧинить по одному: откройте товар по id в админке или скажите id,');
  console.log('и под него будет сделан отдельный патч, как для статей блога.');

  await sql.end();
}

main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
