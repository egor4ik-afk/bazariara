// scripts/migrate-firebase-to-yandex.mjs
// Запуск: node scripts/migrate-firebase-to-yandex.mjs
// Зависимости: npm install @aws-sdk/client-s3

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import postgres from 'postgres';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

config({ path: resolve(process.cwd(), '.env') });

// ─── Переменные окружения ────────────────────────────────────────────────────
const DATABASE_URL       = process.env.DATABASE_URL;
const YA_ACCESS_KEY_ID   = process.env.YANDEX_ACCESS_KEY_ID;
const YA_SECRET_KEY      = process.env.YANDEX_SECRET_ACCESS_KEY;
const YA_BUCKET          = process.env.YANDEX_BUCKET_NAME;
const YA_REGION          = process.env.YANDEX_REGION || 'ru-central1';
const YA_ENDPOINT        = 'https://storage.yandexcloud.net';
const YA_PUBLIC_BASE_URL = `https://storage.yandexcloud.net/${process.env.YANDEX_BUCKET_NAME}`;

if (!DATABASE_URL)     { console.error('❌ DATABASE_URL не найден');          process.exit(1); }
if (!YA_ACCESS_KEY_ID) { console.error('❌ YANDEX_ACCESS_KEY_ID не найден');  process.exit(1); }
if (!YA_SECRET_KEY)    { console.error('❌ YANDEX_SECRET_ACCESS_KEY не найден'); process.exit(1); }
if (!YA_BUCKET)        { console.error('❌ YANDEX_BUCKET_NAME не найден');    process.exit(1); }

// ─── Клиенты ─────────────────────────────────────────────────────────────────
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const s3 = new S3Client({
  region: YA_REGION,
  endpoint: YA_ENDPOINT,
  credentials: { accessKeyId: YA_ACCESS_KEY_ID, secretAccessKey: YA_SECRET_KEY },
  forcePathStyle: true,
});

// ─── Настройки ───────────────────────────────────────────────────────────────
const CONCURRENT = 3;
const DELAY_MS   = 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function extFromContentType(ct = '') {
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('png'))  return 'png';
  if (ct.includes('gif'))  return 'gif';
  return 'jpg';
}

async function downloadImage(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await resp.arrayBuffer());
  return { buffer, contentType };
}

async function existsInYandex(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: YA_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToYandex(buffer, contentType, key) {
  await s3.send(new PutObjectCommand({
    Bucket: YA_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }));
  return `${YA_PUBLIC_BASE_URL}/${key}`;
}

// ─── Семафор ─────────────────────────────────────────────────────────────────
class Semaphore {
  constructor(max) { this.max = max; this.count = 0; this.queue = []; }
  acquire() {
    return new Promise(r =>
      this.count < this.max ? (this.count++, r()) : this.queue.push(r)
    );
  }
  release() {
    this.count--;
    if (this.queue.length) { this.count++; this.queue.shift()(); }
  }
}

// ─── Основная логика ─────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Миграция фото: Firebase JSON → Yandex Object Storage\n');
  console.log(`   Бакет  : ${YA_BUCKET}`);
  console.log(`   Public : ${YA_PUBLIC_BASE_URL}\n`);

  // Ищем Firebase JSON
  let firebaseData = null;
  const jsonCandidates = [
    'bazarge-95f65-default-rtdb-export.json',
    'bazarge-95f65-default-rtdb-export__4_.json',
    'firebase-export.json',
  ];
  for (const p of jsonCandidates) {
    try {
      firebaseData = JSON.parse(readFileSync(resolve(process.cwd(), p), 'utf-8'));
      console.log(`📂 Найден файл: ${p}\n`);
      break;
    } catch {}
  }
  if (!firebaseData) {
    console.error('❌ Firebase JSON не найден. Ожидается один из:\n  ' + jsonCandidates.join('\n  '));
    process.exit(1);
  }

  const sem = new Semaphore(CONCURRENT);
  let totalProducts = 0, totalUploaded = 0, totalSkipped = 0, totalErrors = 0;

  for (const [categoryKey, items] of Object.entries(firebaseData.products || {})) {
    const itemList = Object.values(items);
    console.log(`\n📁 ${categoryKey} — ${itemList.length} товаров`);

    await Promise.all(itemList.map(item => (async () => {
      await sem.acquire();
      try {
        const label = `  [${item.id}]`.padEnd(8) +
          String(item.title || '').slice(0, 36).padEnd(36);
        process.stdout.write(label + ' ');

        // Собираем все URL из Firebase
        const allUrls = [...new Set(
          [item.image_url, ...(item.image_urls || [])].filter(Boolean)
        )];

        if (!allUrls.length) {
          console.log('⏭️  нет фото');
          return;
        }

        const newUrls    = [];
        let itemUploaded = 0;
        let itemSkipped  = 0;

        for (let i = 0; i < allUrls.length; i++) {
          const url = allUrls[i];

          // Уже в Yandex — пропускаем
          if (url.includes('yandexcloud.net')) {
            newUrls.push(url);
            itemSkipped++;
            continue;
          }

          const key = `products/${categoryKey}/${item.id}/${i}`;

          try {
            // Проверяем идемпотентность — вдруг уже загружали
            // (пробуем jpg/webp/png)
            let existingUrl = null;
            for (const ext of ['jpg', 'webp', 'png']) {
              if (await existsInYandex(`${key}.${ext}`)) {
                existingUrl = `${YA_PUBLIC_BASE_URL}/${key}.${ext}`;
                break;
              }
            }
            if (existingUrl) {
              newUrls.push(existingUrl);
              itemSkipped++;
              continue;
            }

            const { buffer, contentType } = await downloadImage(url);
            const fullKey = `${key}.${extFromContentType(contentType)}`;
            const newUrl  = await uploadToYandex(buffer, contentType, fullKey);
            newUrls.push(newUrl);
            itemUploaded++;
            await sleep(DELAY_MS);
          } catch (err) {
            process.stdout.write(`\n    ⚠️  фото ${i}: ${err.message}\n    `);
            newUrls.push(url); // оставляем оригинальный URL при ошибке
            totalErrors++;
          }
        }

        // Обновляем БД
        await sql`
          UPDATE products SET
            image_url  = ${newUrls[0] || null},
            images     = ${JSON.stringify(newUrls)}::jsonb,
            updated_at = NOW()
          WHERE external_id = ${`${categoryKey}_${item.id}`}
            AND source = 'gorgia'
        `;

        totalProducts++;
        totalUploaded += itemUploaded;
        totalSkipped  += itemSkipped;
        console.log(`✅  загружено: ${itemUploaded}, пропущено: ${itemSkipped}`);
      } catch (err) {
        totalErrors++;
        console.log(`❌  ${err.message}`);
      } finally {
        sem.release();
      }
    })()));
  }

  await sql.end();

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`✅ Товаров обработано  : ${totalProducts}`);
  console.log(`📤 Загружено в Yandex  : ${totalUploaded}`);
  console.log(`⏭️  Пропущено (уже OK)  : ${totalSkipped}`);
  console.log(`❌ Ошибок              : ${totalErrors}`);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
