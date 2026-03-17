// scripts/migrate-firebase-to-neon.mjs
// Запуск: node scripts/migrate-firebase-to-neon.mjs
//
// Нужен файл: bazarge-95f65-default-rtdb-export.json в корне проекта
// Нужна переменная: DATABASE_URL в .env.local

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'path';

// Загружаем .env.local
config({ path: resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL не найден в .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ─── НАСТРОЙКИ ИМПОРТА ────────────────────────────────────────────────────────
const TARGET_CATEGORY = 'power_banks_and_accessories';

// Укажи здесь конкретные ID, которые нужно импортировать.
// Если оставить массив пустым [], скрипт загрузит все товары из TARGET_CATEGORY.
const TARGET_IDS = [701, 702, 703, 704, 705, 706, 707]; 


// ─── Добавляем данные в БД ────────────────────────────────────────────────────
async function migrate() {
  // Ищем JSON файл
  const possiblePaths = [
    'bazarge-95f65-default-rtdb-export.json',
    'bazarge-95f65-default-rtdb-export__4_.json',
    'firebase-export.json',
  ];

  let firebaseData = null;
  let usedPath = '';

  for (const p of possiblePaths) {
    try {
      firebaseData = JSON.parse(readFileSync(resolve(process.cwd(), p), 'utf-8'));
      usedPath = p;
      break;
    } catch {}
  }

  if (!firebaseData) {
    console.error('❌ JSON файл не найден.');
    process.exit(1);
  }

  console.log(`📂 Читаем: ${usedPath}`);

  const categories = firebaseData.products || {};
  
  // Проверяем, есть ли нужная категория в файле
  if (!categories[TARGET_CATEGORY]) {
    console.error(`❌ Категория "${TARGET_CATEGORY}" не найдена в JSON файле!`);
    return;
  }

  const items = categories[TARGET_CATEGORY];
  let itemList = Object.values(items);

  // Фильтруем товары, если указаны конкретные ID
  if (TARGET_IDS.length > 0) {
    itemList = itemList.filter(item => TARGET_IDS.includes(Number(item.id)));
  }

  console.log(`\n⏳ Обработка категории: ${TARGET_CATEGORY}`);
  console.log(`🎯 Найдено товаров для импорта: ${itemList.length}`);

  let total = 0;
  let inserted = 0;
  let skipped = 0;

  for (const item of itemList) {
    total++;

    // Считаем, сколько картинок было у товара изначально
    let imagesCount = 0;
    if (item.image_url) imagesCount += 1;
    if (item.image_urls && Array.isArray(item.image_urls)) {
      imagesCount += item.image_urls.length;
    }

    // Генерируем правильные ссылки на Yandex S3
    const yandexImages = [];
    for (let i = 0; i < imagesCount; i++) {
      // Подставляем правильный путь с .jpg, как ты показывал в примере
      yandexImages.push(`https://storage.yandexcloud.net/izipost/products/${TARGET_CATEGORY}/${item.id}/${i}.jpg`);
    }

    // Главное фото — это индекс 0 (если картинки вообще есть)
    const mainImageUrl = yandexImages.length > 0 ? yandexImages[0] : null;

    try {
      await sql`
        INSERT INTO products (
          external_id,
          source,
          source_url,
          name,
          name_ru,
          name_en,
          name_ka,
          description,
          description_ru,
          description_en,
          description_ka,
          price,
          currency,
          in_stock,
          availability,
          availability_ru,
          availability_ka,
          category,
          category_ru,
          category_en,
          category_ka,
          sub_category,
          sub_category_ru,
          sub_category_en,
          sub_category_ka,
          category_key,
          image_url,
          images,
          gorgia_url,
          sku,
          other
        ) VALUES (
          ${`${TARGET_CATEGORY}_${item.id}`},
          'gorgia',
          ${item.link || null},
          ${item.title || item.title_en || ''},
          ${item.title     || null},
          ${item.title_en  || null},
          null,
          ${item.description    || item.description_en || null},
          ${item.description    || null},
          ${item.description_en || null},
          null,
          ${item.price ? parseFloat(item.price) : null},
          'GEL',
          ${item.in_stock === true || item.availability === 'В наличии'},
          ${item.availability || null},
          ${item.availability || null},
          null,
          ${item.category    || null},
          ${item.category    || null},
          ${item.category_en || null},
          null,
          ${item.sub_category    || null},
          ${item.sub_category    || null},
          ${item.sub_category_en || null},
          null,
          ${TARGET_CATEGORY},
          ${mainImageUrl},
          ${JSON.stringify(yandexImages)}::jsonb,
          ${item.link || null},
          null,
          '{}'::jsonb
        )
        ON CONFLICT (external_id) DO NOTHING
      `;
      inserted++;
      process.stdout.write(`  ✅ [${inserted}] ${item.title || item.title_en} (${yandexImages.length} фото)\n`);
    } catch (err) {
      skipped++;
      console.error(`  ❌ Ошибка при добавлении ID ${item.id}: ${err.message}`);
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Готово!`);
  console.log(`   Успешно добавлено:     ${inserted}`);
  console.log(`   Пропущено (дубли/ошибки): ${skipped}`);
  console.log('─────────────────────────────────');
}

// ─── Запуск ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Старт импорта точечных товаров в Neon PostgreSQL...\n');
  await migrate();
}

main().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});