// scripts/migrate-categories.mjs
// Запуск: node scripts/migrate-categories.mjs

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: resolve(process.cwd(), '.env') });

const BLOB_TOKEN   = process.env.BLOB_READ_WRITE_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

if (!BLOB_TOKEN)   { console.error('❌ BLOB_READ_WRITE_TOKEN не найден'); process.exit(1); }
if (!DATABASE_URL) { console.error('❌ DATABASE_URL не найден'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function downloadImage(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return { 
    buffer: await resp.arrayBuffer(), 
    contentType: resp.headers.get('content-type') || 'image/jpeg' 
  };
}

async function uploadToBlob(buffer, contentType, blobPath) {
  const resp = await fetch(`https://blob.vercel-storage.com/${blobPath}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${BLOB_TOKEN}`, 'Content-Type': contentType },
    body: buffer,
  });
  if (!resp.ok) throw new Error(`Blob Error: await resp.text()`);
  return (await resp.json()).url;
}

async function main() {
  console.log('🚀 Старт миграции превью категорий...\n');

  // Укажите правильное имя вашего JSON файла
  const jsonPath = resolve(process.cwd(), 'bazarge-95f65-default-rtdb-export.json');
  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch (e) {
    console.error('❌ Ошибка чтения JSON файла:', e.message);
    process.exit(1);
  }

  for (const [categoryKey, categoryData] of Object.entries(data.products || {})) {
    // Берем поле category_image, которое лежит на одном уровне с товарами (как в вашем примере)
    const sourceImage = categoryData.category_image;

    if (!sourceImage) {
      console.log(`⚠️ Пропуск [${categoryKey}]: нет поля category_image`);
      continue;
    }

    let finalBlobUrl = sourceImage;

    // Если картинка еще не в Vercel Blob (например, на ibb.co)
    if (!sourceImage.includes('blob.vercel')) {
      try {
        process.stdout.write(`⏳ Загрузка фото для ${categoryKey}... `);
        const { buffer, contentType } = await downloadImage(sourceImage);
        
        // Определяем расширение
        const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
        
        // Загружаем в папку categories
        finalBlobUrl = await uploadToBlob(buffer, contentType, `categories/${categoryKey}.${ext}`);
        console.log(`✅`);
      } catch (err) {
        console.log(`❌ Ошибка загрузки картинки: ${err.message}`);
        continue; // Если не удалось скачать/загрузить, пропускаем сохранение в БД
      }
    }

    // Сохраняем в таблицу categories
    try {
      await sql`
        INSERT INTO categories (category, category_image) 
        VALUES (${categoryKey}, ${finalBlobUrl})
        ON CONFLICT (category) DO UPDATE SET category_image = EXCLUDED.category_image
      `;
      console.log(`💾 Категория [${categoryKey}] сохранена в БД -> ${finalBlobUrl}\n`);
    } catch (dbErr) {
      console.error(`❌ Ошибка БД для ${categoryKey}: ${dbErr.message}\n`);
    }
  }

  await sql.end();
  console.log('🎉 Миграция успешно завершена!');
}

main().catch(console.error);