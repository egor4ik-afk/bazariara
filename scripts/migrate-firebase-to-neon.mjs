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

// ─── Создаём таблицы ──────────────────────────────────────────────────────────
async function createTables() {
  console.log('📦 Создаём таблицы...');
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id              SERIAL PRIMARY KEY,
      external_id     TEXT,
      source          TEXT NOT NULL DEFAULT 'gorgia',
      source_url      TEXT,

      -- Основное поле (ru — приоритет)
      name            TEXT NOT NULL,

      -- Двуязычные поля (ru + en, ka добавит скрапер позже)
      name_ru         TEXT,
      name_en         TEXT,
      name_ka         TEXT,

      description     TEXT,
      description_ru  TEXT,
      description_en  TEXT,
      description_ka  TEXT,

      price           NUMERIC(10,2),
      currency        TEXT DEFAULT 'GEL',
      in_stock        BOOLEAN DEFAULT TRUE,
      availability    TEXT,

      -- Категории
      category        TEXT,
      category_en     TEXT,
      sub_category    TEXT,
      sub_category_en TEXT,

      -- Фото: главное + дополнительные
      image_url       TEXT,
      images          JSONB DEFAULT '[]',

      -- Оригинальная ссылка на gorgia.ge
      gorgia_url      TEXT,

      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_products_source    ON products(source)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_in_stock  ON products(in_stock)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_products_price     ON products(price)`;

  console.log('✅ Таблицы созданы');
}

// ─── Мигрируем данные ─────────────────────────────────────────────────────────
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
    console.error('❌ JSON файл не найден. Положи его в корень проекта и назови:');
    console.error('   bazarge-95f65-default-rtdb-export.json');
    process.exit(1);
  }

  console.log(`📂 Читаем: ${usedPath}`);

  const categories = firebaseData.products || {};
  const categoryKeys = Object.keys(categories);
  console.log(`📁 Категорий: ${categoryKeys.join(', ')}`);

  let total = 0;
  let inserted = 0;
  let skipped = 0;

  for (const categoryKey of categoryKeys) {
    const items = categories[categoryKey];
    const itemList = Object.values(items);

    console.log(`\n⏳ Категория: ${categoryKey} (${itemList.length} товаров)`);

    for (const item of itemList) {
      total++;

      // Собираем все фото в один массив
      const allImages = [];
      if (item.image_url)  allImages.push(item.image_url);
      if (item.image_urls) allImages.push(...item.image_urls);

      // Уникальные URL без дублей
      const uniqueImages = [...new Set(allImages)];

      try {
        await sql`
          INSERT INTO products (
            external_id,
            source,
            source_url,
            name,
            name_ru,
            name_en,
            description,
            description_ru,
            description_en,
            price,
            currency,
            in_stock,
            availability,
            category,
            category_en,
            sub_category,
            sub_category_en,
            image_url,
            images,
            gorgia_url
          ) VALUES (
            ${`${categoryKey}_${item.id}`},
            'gorgia',
            ${item.link || null},
            ${item.title || item.title_en || ''},
            ${item.title     || null},
            ${item.title_en  || null},
            ${item.description    || item.description_en || null},
            ${item.description    || null},
            ${item.description_en || null},
            ${item.price ? parseFloat(item.price) : null},
            'GEL',
            ${item.in_stock === true || item.availability === 'В наличии'},
            ${item.availability || null},
            ${item.category    || null},
            ${item.category_en || null},
            ${item.sub_category    || null},
            ${item.sub_category_en || null},
            ${item.image_url || null},
            ${JSON.stringify(uniqueImages)},
            ${item.link || null}
          )
          ON CONFLICT DO NOTHING
        `;
        inserted++;
        process.stdout.write(`  ✅ [${inserted}] ${item.title || item.title_en}\n`);
      } catch (err) {
        skipped++;
        console.error(`  ❌ Ошибка: ${item.title} — ${err.message}`);
      }
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Готово!`);
  console.log(`   Всего в JSON:  ${total}`);
  console.log(`   Вставлено:     ${inserted}`);
  console.log(`   Пропущено:     ${skipped}`);
  console.log('─────────────────────────────────');
}

// ─── Запуск ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Миграция Firebase → Neon PostgreSQL\n');
  await createTables();
  await migrate();
  console.log('\n🎉 Миграция завершена!');
  console.log('   Проверь: https://console.neon.tech → твой проект → Tables');
}

main().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});
