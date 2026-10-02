/**
 * db-final.ts — разовая чистка базы. Повторный запуск безопасен.
 *
 *   npx tsx db-final.ts           — показать, что будет сделано
 *   npx tsx db-final.ts --apply   — выполнить
 *
 * 1. Три английских названия: «Pastila» — калька с русского, англоязычный
 *    покупатель такого слова не знает; принятый термин — fruit leather.
 * 2. Пустые резервные таблицы от 12.07.2026. В схеме Prisma их нет, после
 *    удаления схема и база сойдутся, и prisma db push станет безопасным.
 * 3. product_translations. Сайт эту таблицу не читает, а в одной из строк
 *    номер модели переписан с J101 на J122.
 */

import 'dotenv/config';
import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');
const raw = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').trim();
if (!raw || raw.includes('user:password@host')) {
  console.error('\nDATABASE_URL не задан или содержит заглушку.\n');
  process.exit(1);
}
const sql = postgres(raw, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });

const NAMES: [number, string][] = [
  [11561, 'Tkemali fruit leather from Imereti'],
  [11560, 'Plum fruit leather from Kartli'],
  [11558, 'Imeretian churchkhela with hazelnuts, gift box'],
];

async function exists(t: string) {
  const [r] = await sql`SELECT to_regclass(${'public.' + t}) IS NOT NULL AS e`;
  return Boolean(r.e);
}

async function main() {
  console.log(APPLY ? '\nВыполняю.\n' : '\nПредпросмотр, база не меняется.\n');

  console.log('1. Английские названия');
  for (const [id, name] of NAMES) {
    const [r] = await sql`SELECT name_en FROM products WHERE id = ${id}`;
    if (!r) { console.log(`   #${id}: товара нет, пропуск`); continue; }
    if (r.name_en === name) { console.log(`   #${id}: уже исправлено`); continue; }
    console.log(`   #${id}: «${r.name_en}» → «${name}»`);
    if (APPLY) await sql`UPDATE products SET name_en = ${name}, updated_at = NOW() WHERE id = ${id}`;
  }

  console.log('\n2. Пустые резервные таблицы');
  for (const t of ['products_backup_20260712', 'categories_backup_20260712']) {
    if (!(await exists(t))) { console.log(`   ${t}: уже нет`); continue; }
    const [{ n }] = await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`);
    if (n > 0) { console.log(`   ${t}: ${n} строк — НЕ пустая, не трогаю`); continue; }
    console.log(`   ${t}: пустая, удаляется`);
    if (APPLY) await sql.unsafe(`DROP TABLE ${t}`);
  }

  console.log('\n3. product_translations');
  if (!(await exists('product_translations'))) {
    console.log('   таблицы нет');
  } else {
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM product_translations`;
    console.log(n ? `   ${n} строк, очищается` : '   уже пустая');
    if (APPLY && n) await sql`DELETE FROM product_translations`;
  }

  console.log(APPLY ? '\nГотово.\n' : '\nВыполнить: npx tsx db-final.ts --apply\n');
  await sql.end();
}

main().catch(async (e) => { console.error('\nОшибка:', e?.message || e); await sql.end().catch(() => {}); process.exit(1); });
