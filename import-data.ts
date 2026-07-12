/**
 * Восстановление товаров и категорий из JSON-дампа старой БД.
 *
 * Запуск (любой из вариантов):
 *   npx tsx import-products.ts ./products\ \(4\)\ \(1\).json
 *   node import-products.js ./products.json          // если переименовать в .js
 *
 * Путь к файлу можно передать аргументом; по умолчанию берётся из DATA_FILE ниже.
 */

require('dotenv').config();
const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Путь к дампу: первый аргумент командной строки или значение по умолчанию.
const DATA_FILE = process.argv[2] || 'products (4) (1).json';

// Сохранять оригинальные id из дампа (важно для стабильных URL и SEO).
// Если по какой-то причине нужно перенумеровать с нуля — поставь false.
const PRESERVE_IDS = true;

const BATCH = 200;

/** Постгресовый timestamptz ("2026-03-14 21:59:20.34535+00") -> JS Date. */
function pgToDate(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  let t = String(s).trim().replace(' ', 'T');
  t = t.replace(/(\.\d{3})\d+/, '$1');                       // микро- -> миллисекунды
  t = t.replace(/([+-]\d{2})(?!:?\d)/, (_m: string, off: string) =>
    off === '+00' ? 'Z' : off + ':00',                       // "+00" -> "Z", "+04" -> "+04:00"
  );
  const d = new Date(t);
  return isNaN(d.getTime()) ? new Date(s) : d;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Файл не найден: ${DATA_FILE}. Передай путь аргументом.`);
  }

  const data: any[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`📦 Загружено ${data.length} товаров из ${DATA_FILE}`);

  console.log('🧹 Очистка старых данных...');
  // Сначала products, потом categories — на случай внешних ключей.
  await prisma.products.deleteMany();
  await prisma.categories.deleteMany();

  // ── Категории ───────────────────────────────────────────────────────────
  // Ключ берём из РЕАЛЬНОГО поля category_key в данных, НЕ слугифицируем имя.
  // Это устраняет два бага старого скрипта:
  //   1) разные категории с одинаковым именем ("Сад": sad + garden) -> конфликт @unique;
  //   2) кириллический slug не совпадает с ключами вида 'climate', по которым фильтрует сайт.
  const catMap = new Map<string, { name: string; category_image: string | null }>();
  for (const it of data) {
    const key = it.category_key;
    if (!key || catMap.has(key)) continue;
    catMap.set(key, {
      name: it.category_ru || it.category || it.category_en || key,
      // У категорий нет своего изображения в дампе — берём первое фото товара категории.
      category_image: it.image_url || null,
    });
  }

  const categoriesData = Array.from(catMap.entries()).map(([category_key, v]) => ({
    name: v.name,
    category_key,
    parent_id: null,                 // иерархии в дампе нет
    category_image: v.category_image,
  }));

  await prisma.categories.createMany({ data: categoriesData, skipDuplicates: true });
  console.log(`✅ Категорий восстановлено: ${categoriesData.length}`);

  // ── Товары ──────────────────────────────────────────────────────────────
  const productsData = data.map((item) => {
    const created = pgToDate(item.created_at);
    const updated = pgToDate(item.updated_at);

    const row: any = {
      external_id: item.external_id != null ? String(item.external_id) : null,
      source: item.source || 'market',
      source_url: item.source_url || null,
      gorgia_url: item.gorgia_url || null,

      // Названия / описания (все языки)
      name: item.name || '',
      name_ru: item.name_ru || null,
      name_en: item.name_en || null,
      name_ka: item.name_ka || null,
      description: item.description || null,
      description_ru: item.description_ru || null,
      description_en: item.description_en || null,
      description_ka: item.description_ka || null,

      // Цена / наличие. Decimal принимает строку -> без потери точности.
      price: item.price != null && item.price !== '' ? new Prisma.Decimal(item.price) : null,
      currency: item.currency || 'GEL',
      in_stock: Boolean(item.in_stock),
      availability: item.availability || null,

      // Категории (ключ + все языки)
      category: item.category || null,
      category_en: item.category_en || null,
      category_ka: item.category_ka || null,
      category_key: item.category_key || null,
      sub_category: item.sub_category || null,
      sub_category_en: item.sub_category_en || null,
      sub_category_ka: item.sub_category_ka || null,

      // Идентификаторы
      sku: item.sku || null,

      // Картинки
      image_url: item.image_url || null,
      images: Array.isArray(item.images) ? item.images : [],
    };

    if (created) row.created_at = created;
    if (updated) row.updated_at = updated;
    if (PRESERVE_IDS && item.id != null) row.id = BigInt(item.id);

    return row;
  });

  console.log(`🚀 Импорт ${productsData.length} товаров батчами по ${BATCH}...`);
  let done = 0;
  for (const part of chunk(productsData, BATCH)) {
    const res = await prisma.products.createMany({ data: part, skipDuplicates: true });
    done += res.count;
    console.log(`   ...${done}/${productsData.length}`);
  }

  // ── Сброс sequence ────────────────────────────────────────────────────────
  // После вставки с явными id автоинкремент надо сдвинуть на max(id),
  // иначе следующая вставка без id упадёт на конфликте PRIMARY KEY.
  if (PRESERVE_IDS) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('products','id'),
        GREATEST((SELECT COALESCE(MAX(id),1) FROM products), 1))`,
    );
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('categories','id'),
        GREATEST((SELECT COALESCE(MAX(id),1) FROM categories), 1))`,
    );
    console.log('🔧 Sequence для products/categories обновлены.');
  }

  // ── Контроль ───────────────────────────────────────────────────────────────
  const [pCount, cCount] = await Promise.all([
    prisma.products.count(),
    prisma.categories.count(),
  ]);
  console.log(`📊 Итого в БД: товаров ${pCount}, категорий ${cCount}`);
  console.log('✅ Импорт успешно завершён!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка импорта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });