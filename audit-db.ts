/**
 * audit-db.ts — проверяет, что в базе на самом деле. Только читает.
 *
 *   npx tsx audit-db.ts
 *
 * ЗАЧЕМ
 * В коммите 199d7db схему Prisma поменяли, а скрипт перевода переписали
 * под другую таблицу. Ни то, ни другое само по себе базу не трогает, но
 * оба изменения становятся опасными при первом же `prisma db push`.
 * Этот скрипт показывает, применились ли они уже к базе.
 *
 * ЧТО ПРОВЕРЯЕТ
 *  1. Куда вообще подключились: хост, база, endpoint Neon.
 *  2. Целы ли резервные таблицы products_backup_20260712 и
 *     categories_backup_20260712. Из схемы их удалили; если выполнить
 *     `prisma db push`, Prisma сочтёт их лишними и УДАЛИТ.
 *  3. Есть ли внешний ключ product_translations -> products с каскадным
 *     удалением. Его в схему добавили; если он уже в базе, значит push
 *     выполняли, и пункт 2 надо проверять особенно внимательно.
 *  4. Сколько строк в product_translations. Сайт эту таблицу не читает:
 *     переводы он берёт из колонок products.name_en, name_ka и т. д.
 *     Строки здесь означают, что скрипт перевода отработал вхолостую.
 *  5. На месте ли сами колонки переводов в products.
 *  6. Состояние переводов: сколько пустых, сколько с кириллицей.
 */

import 'dotenv/config';
import postgres from 'postgres';

const raw = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').trim();
if (!raw || raw.includes('user:password@host')) {
  console.error('\nDATABASE_URL не задан или содержит заглушку.');
  console.error('Сначала: npx tsx check-db-connection.ts\n');
  process.exit(1);
}

const sql = postgres(raw, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

const ok = (s: string) => `  ✓ ${s}`;
const warn = (s: string) => `  ! ${s}`;
const bad = (s: string) => `  ✗ ${s}`;

async function tableExists(name: string): Promise<boolean> {
  const [r] = await sql`SELECT to_regclass(${'public.' + name}) IS NOT NULL AS e`;
  return Boolean(r.e);
}

async function count(name: string): Promise<number | null> {
  try {
    const [r] = await sql.unsafe(`SELECT count(*)::int AS n FROM ${name}`);
    return r.n as number;
  } catch {
    return null;
  }
}

async function main() {
  const problems: string[] = [];

  // ── 1. куда подключились ──
  console.log('\n1. ПОДКЛЮЧЕНИЕ');
  console.log('─'.repeat(70));
  const u = new URL(raw);
  const [db] = await sql`SELECT current_database() AS db`;
  console.log(`  хост:     ${u.hostname}`);
  console.log(`  база:     ${db.db}`);
  const ep = u.hostname.match(/^(ep-[a-z0-9-]+)/i);
  if (ep) console.log(`  endpoint: ${ep[1]}   ← сверьте с Vercel до любых правок`);

  // ── 2. резервные таблицы ──
  console.log('\n2. РЕЗЕРВНЫЕ ТАБЛИЦЫ ОТ 12.07.2026');
  console.log('─'.repeat(70));
  for (const t of ['products_backup_20260712', 'categories_backup_20260712']) {
    const exists = await tableExists(t);
    if (exists) {
      const n = await count(t);
      console.log(ok(`${t}: на месте, ${n} строк`));
    } else {
      console.log(bad(`${t}: НЕТ В БАЗЕ`));
      problems.push(`Резервная таблица ${t} отсутствует. Либо её удалили раньше, либо выполнили prisma db push после того, как её убрали из схемы.`);
    }
  }
  console.log('');
  console.log('  Из prisma/schema.prisma эти модели удалили в коммите 199d7db.');
  console.log('  Пока вы не запускали prisma db push или prisma migrate,');
  console.log('  таблицы в базе целы. При первом же push Prisma удалит их.');

  // ── 3. внешний ключ с каскадом ──
  console.log('\n3. ВНЕШНИЙ КЛЮЧ product_translations -> products');
  console.log('─'.repeat(70));
  const fks = await sql`
    SELECT c.conname, pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'product_translations' AND c.contype = 'f'
  `;
  if (!fks.length) {
    console.log(ok('внешнего ключа нет — схему в базу не заливали'));
  } else {
    for (const f of fks as any[]) {
      console.log(warn(`${f.conname}: ${f.def}`));
      if (/CASCADE/i.test(f.def)) {
        problems.push('В базе есть внешний ключ с ON DELETE CASCADE на product_translations. Значит, prisma db push уже выполняли — проверьте пункт 2 особенно внимательно.');
      }
    }
  }

  // ── 4. куда писал скрипт перевода ──
  console.log('\n4. ТАБЛИЦА product_translations');
  console.log('─'.repeat(70));
  if (!(await tableExists('product_translations'))) {
    console.log(ok('таблицы нет'));
  } else {
    const n = (await count('product_translations')) ?? 0;
    if (n === 0) {
      console.log(ok('таблица пустая — скрипт перевода в неё ничего не записал'));
    } else {
      console.log(warn(`${n} строк`));
      const byLang = await sql`SELECT lang, count(*)::int AS n FROM product_translations GROUP BY lang ORDER BY lang`;
      for (const r of byLang as any[]) console.log(`      ${r.lang}: ${r.n}`);
      problems.push(`В product_translations ${n} строк, но сайт эту таблицу не читает: переводы он берёт из колонок products.name_en, name_ka, description_en, description_ka. Эти строки на сайте не видны.`);
    }
  }

  // ── 5. колонки переводов в products ──
  console.log('\n5. КОЛОНКИ ПЕРЕВОДОВ В products');
  console.log('─'.repeat(70));
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name IN ('name_ru','name_en','name_ka','description_ru','description_en','description_ka')
  `;
  const have = new Set((cols as any[]).map((c) => c.column_name));
  for (const c of ['name_ru', 'name_en', 'name_ka', 'description_ru', 'description_en', 'description_ka']) {
    if (have.has(c)) console.log(ok(c));
    else {
      console.log(bad(`${c} — КОЛОНКИ НЕТ`));
      problems.push(`В products нет колонки ${c}. Сайт её читает — страницы товаров сломаются.`);
    }
  }

  // ── 6. состояние переводов ──
  if (have.has('name_en') && have.has('name_ka')) {
    console.log('\n6. СОСТОЯНИЕ ПЕРЕВОДОВ');
    console.log('─'.repeat(70));
    const [s] = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE coalesce(name_en,'') = '')::int AS no_en,
        count(*) FILTER (WHERE coalesce(name_ka,'') = '')::int AS no_ka,
        count(*) FILTER (WHERE name_en ~ '[А-Яа-яЁё]')::int AS cyr_en,
        count(*) FILTER (WHERE name_ka ~ '[А-Яа-яЁё]')::int AS cyr_ka,
        count(*) FILTER (WHERE name_ka !~ '[\\u10A0-\\u10FF]' AND coalesce(name_ka,'') <> '')::int AS no_geo
      FROM products
    `;
    console.log(`  всего товаров:                 ${s.total}`);
    console.log(`  без английского названия:      ${s.no_en}`);
    console.log(`  без грузинского названия:      ${s.no_ka}`);
    console.log(`  кириллица в name_en:           ${s.cyr_en}`);
    console.log(`  кириллица в name_ka:           ${s.cyr_ka}`);
    console.log(`  name_ka без грузинских букв:   ${s.no_geo}`);
  }

  // ── итог ──
  console.log('\nИТОГ');
  console.log('═'.repeat(70));
  if (!problems.length) {
    console.log('  Ничего испорченного не нашлось. База в прежнем состоянии.');
  } else {
    problems.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p}`);
      console.log('');
    });
  }
  console.log('  Главное правило до тех пор, пока схема расходится с базой:');
  console.log('  НЕ запускайте prisma db push и prisma migrate. Они приведут');
  console.log('  базу в соответствие со схемой, то есть удалят то, чего в схеме нет.');
  console.log('');

  await sql.end();
}

main().catch(async (e) => {
  console.error('\nОшибка:', e?.message || e);
  await sql.end().catch(() => {});
  process.exit(1);
});
