// scripts/migrate-images-to-blob.mjs
// Запуск: node scripts/migrate-images-to-blob.mjs
// Зависимости: postgres, dotenv (уже установлены)
// НЕ нужны: @vercel/blob, @neondatabase/serverless

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: resolve(process.cwd(), '.env') });

const BLOB_TOKEN   = process.env.BLOB_READ_WRITE_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

if (!BLOB_TOKEN)   { console.error('❌ BLOB_READ_WRITE_TOKEN не найден в .env.local'); process.exit(1); }
if (!DATABASE_URL) { console.error('❌ DATABASE_URL не найден в .env.local'); process.exit(1); }

const sql = postgres(DATABASE_URL, { ssl: 'require' });
const CONCURRENT = 3;
const DELAY_MS   = 400;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function downloadImage(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return { buffer: await resp.arrayBuffer(), contentType: resp.headers.get('content-type') || 'image/jpeg' };
}

async function uploadToBlob(buffer, contentType, blobPath) {
  const resp = await fetch(`https://blob.vercel-storage.com/${blobPath}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${BLOB_TOKEN}`, 'Content-Type': contentType },
    body: buffer,
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`Blob ${resp.status}: ${(await resp.text()).slice(0, 100)}`);
  return (await resp.json()).url;
}

async function processProduct(categoryKey, item) {
  const uniqueImages = [...new Set([item.image_url, ...(item.image_urls || [])].filter(Boolean))];
  if (!uniqueImages.length) return { uploaded: [], skipped: 0 };

  const uploadedUrls = [];
  let skipped = 0;

  for (let i = 0; i < uniqueImages.length; i++) {
    const url = uniqueImages[i];
    if (url.includes('vercel-storage.com') || url.includes('blob.vercel')) {
      uploadedUrls.push(url); skipped++; continue;
    }
    try {
      const { buffer, contentType } = await downloadImage(url);
      const ext = contentType.includes('webp') ? 'webp' : contentType.includes('png') ? 'png' : 'jpg';
      const blobUrl = await uploadToBlob(buffer, contentType, `products/${categoryKey}/${item.id}/${i}.${ext}`);
      uploadedUrls.push(blobUrl);
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`\n    ⚠️  фото ${i}: ${err.message}`);
      uploadedUrls.push(url);
    }
  }
  return { uploaded: uploadedUrls, skipped };
}

class Semaphore {
  constructor(max) { this.max = max; this.count = 0; this.queue = []; }
  acquire() { return new Promise(r => this.count < this.max ? (this.count++, r()) : this.queue.push(r)); }
  release() { this.count--; if (this.queue.length) { this.count++; this.queue.shift()(); } }
}

async function main() {
  console.log('🚀 Миграция фото: ibb.co → Vercel Blob\n');

  let firebaseData = null;
  for (const p of ['bazarge-95f65-default-rtdb-export.json', 'bazarge-95f65-default-rtdb-export__4_.json', 'firebase-export.json']) {
    try { firebaseData = JSON.parse(readFileSync(resolve(process.cwd(), p), 'utf-8')); console.log(`📂 ${p}\n`); break; } catch {}
  }
  if (!firebaseData) { console.error('❌ JSON файл не найден в корне проекта'); process.exit(1); }

  const sem = new Semaphore(CONCURRENT);
  let totalProducts = 0, totalImages = 0, totalSkipped = 0, totalErrors = 0;

  for (const [categoryKey, items] of Object.entries(firebaseData.products || {})) {
    const itemList = Object.values(items);
    console.log(`\n📁 ${categoryKey} — ${itemList.length} товаров`);

    await Promise.all(itemList.map(item => async () => {
      await sem.acquire();
      try {
        process.stdout.write(`  [${item.id}] ${String(item.title || '').slice(0, 35).padEnd(35)} `);
        const { uploaded, skipped } = await processProduct(categoryKey, item);

        // Обновляем БД
        await sql`
          UPDATE products SET
            image_url  = ${uploaded[0] || null},
            images     = ${JSON.stringify(uploaded)}::jsonb,
            updated_at = NOW()
          WHERE external_id = ${`${categoryKey}_${item.id}`} AND source = 'gorgia'
        `;

        totalProducts++;
        totalImages  += uploaded.length - skipped;
        totalSkipped += skipped;
        console.log(`✅ ${uploaded.length - skipped} загружено, ${skipped} уже в blob`);
      } catch (err) {
        totalErrors++;
        console.log(`❌ ${err.message}`);
      } finally {
        sem.release();
      }
    }).map(t => t()));
  }

  await sql.end();
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`✅ Товаров: ${totalProducts} | Загружено: ${totalImages} | Уже в blob: ${totalSkipped} | Ошибок: ${totalErrors}`);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
