/**
 * check-images.ts — находит ссылки на картинки, которые CDN не отдаёт.
 *
 * Запуск:  npx tsx check-images.ts
 *          npx tsx check-images.ts --fix    (чинит категории фолбэком)
 *
 * Конфиг Next тут ни при чём: `cdn.relaxdev.ru` в remotePatterns есть,
 * а при `unoptimized: true` Next картинки вообще не проксирует — браузер
 * идёт в CDN напрямую. Если картинка не грузится, значит файла в бакете
 * нет: его удалили, переименовали или URL записали с опечаткой.
 */

import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL не найден. Запускайте из корня проекта.');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: 'require', max: 5, idle_timeout: 20 });
const FIX = process.argv.includes('--fix');

/** HEAD дешевле GET: тело картинки нам не нужно, только статус. */
async function alive(url: string): Promise<number> {
  if (!url || url.startsWith('/')) return 0;   // локальные файлы не проверяем
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.status;
  } catch {
    return -1;
  }
}

/** Небольшими пачками, чтобы не устроить себе же DDoS по CDN. */
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  }
  return out;
}

async function main() {
  console.log('⏳ Проверяем картинки…\n');

  // ── Категории ───────────────────────────────────────────────────────────
  const cats = await sql`
    SELECT category_key, name, category_image FROM categories
    WHERE category_image IS NOT NULL AND category_image <> ''
  `;
  const catResults = await inBatches(cats as any[], 6, async (c) => ({
    ...c, status: await alive(c.category_image),
  }));

  const badCats = catResults.filter((c) => c.status >= 400 || c.status === -1);

  console.log(`Категории: проверено ${catResults.length}, битых ${badCats.length}`);
  for (const c of badCats) {
    console.log(`   ✗ ${c.name} (${c.category_key}) — ${c.status}`);
    console.log(`     ${c.category_image}`);
  }

  // ── Товары ──────────────────────────────────────────────────────────────
  const prods = await sql`
    SELECT id, sku, name_ru, image_url FROM products
    WHERE source = 'gorgia' AND image_url IS NOT NULL
      AND image_url NOT LIKE '/placeholder%'
    ORDER BY id
  `;
  const prodResults = await inBatches(prods as any[], 8, async (p) => ({
    ...p, status: await alive(p.image_url),
  }));

  const badProds = prodResults.filter((p) => p.status >= 400 || p.status === -1);

  console.log(`\nТовары: проверено ${prodResults.length}, битых ${badProds.length}`);
  for (const p of badProds.slice(0, 30)) {
    console.log(`   ✗ #${p.id} ${p.name_ru} — ${p.status}`);
  }
  if (badProds.length > 30) console.log(`   … и ещё ${badProds.length - 30}`);

  // ── Починка ─────────────────────────────────────────────────────────────
  if (!FIX) {
    console.log('\nЗапустите с --fix, чтобы обнулить битые ссылки категорий.');
    console.log('Карусель после этого возьмёт фото первого товара категории.');
    return;
  }

  if (badCats.length > 0) {
    await sql`
      UPDATE categories SET category_image = NULL
      WHERE category_key = ANY(${badCats.map((c) => c.category_key)})
    `;
    console.log(`\n✓ Обнулено ссылок у категорий: ${badCats.length}`);
    console.log('  Фолбэк в getCategories подставит фото первого товара.');
  }

  if (badProds.length > 0) {
    // У товаров не обнуляем: image_url IS NULL выкинет их из витрины
    // целиком. Ставим заглушку — товар останется на месте, а фото
    // догрузите через админку.
    await sql`
      UPDATE products SET image_url = '/placeholder-product.svg', updated_at = NOW()
      WHERE id = ANY(${badProds.map((p) => Number(p.id))})
    `;
    console.log(`✓ Заглушка проставлена товарам: ${badProds.length}`);
    console.log('  Список выше — что нужно перезалить через /admin/products.');
  }
}

main()
  .catch((e) => { console.error('❌ Ошибка:', e); process.exitCode = 1; })
  .finally(() => sql.end());
