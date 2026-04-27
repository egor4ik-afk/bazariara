import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sql from '@/lib/db';
import sharp from 'sharp';

// ─── S3 ───────────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: process.env.YANDEX_REGION || 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId:     process.env.YANDEX_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET  = 'izipost';
const CDN_URL = 'https://cdn.relaxdev.ru/bazariara';

// ─── HELPERS (дублируем логику из process-image) ──────────────────────────────

type Effect = 'whitebg' | 'frame' | 'shadow' | 'mirror' | 'product';

async function fetchImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Fetch ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processImage(buffer: Buffer, effect: Effect): Promise<Buffer> {
  const white = () =>
    sharp(buffer).flatten({ background: { r: 255, g: 255, b: 255 } });

  if (effect === 'whitebg') {
    return white().jpeg({ quality: 92 }).toBuffer();
  }

  if (effect === 'mirror') {
    return sharp(buffer).flop().jpeg({ quality: 92 }).toBuffer();
  }

  if (effect === 'frame') {
    return white()
      .extend({ top: 40, bottom: 40, left: 40, right: 40,
        background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 92 })
      .toBuffer();
  }

  if (effect === 'shadow' || effect === 'product') {
    const PADDING = effect === 'product' ? 30 : 50;

    const withBg = await sharp(buffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .extend({
        top: effect === 'product' ? 20 : 0,
        bottom: effect === 'product' ? 20 : 0,
        left: effect === 'product' ? 20 : 0,
        right: effect === 'product' ? 20 : 0,
        background: { r: 255, g: 255, b: 255 },
      })
      .toBuffer();

    const meta = await sharp(withBg).metadata();
    const w    = meta.width!;
    const h    = meta.height!;

    const shadowLayer = await sharp({
      create: { width: w, height: h, channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 160 } },
    }).png().blur(16).toBuffer();

    return sharp({
      create: { width: w + PADDING * 2, height: h + PADDING * 2,
        channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .composite([
        { input: shadowLayer, left: PADDING + 4, top: PADDING + 10, blend: 'multiply' },
        { input: withBg, left: PADDING, top: PADDING },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();
  }

  throw new Error(`Unknown effect: ${effect}`);
}

async function uploadBuffer(buffer: Buffer, effect: Effect): Promise<string> {
  const key  = `bazariara/processed/batch_${effect}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer,
    ContentType: 'image/jpeg', ACL: 'public-read',
  }));
  return `${CDN_URL}/processed/batch_${effect}_${key.split('batch_')[1]}`;
}

// ─── API ──────────────────────────────────────────────────────────────────────

// POST /api/admin/batch-process-images
// Body: { ids: number[], effect: Effect, target: 'main' | 'all', batch_size?: number }
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const {
    ids,
    effect = 'product',
    target = 'main',      // 'main' = только image_url, 'all' = все images[]
    batch_size = 20,
  }: {
    ids: number[];
    effect: Effect;
    target: 'main' | 'all';
    batch_size?: number;
  } = await req.json();

  if (!ids?.length) return NextResponse.json({ error: 'Нет ids' }, { status: 400 });

  const results: { id: number; ok: boolean; error?: string }[] = [];
  const chunk = ids.slice(0, batch_size);

  for (const id of chunk) {
    try {
      const rows = await sql`
        SELECT id, image_url, images FROM products WHERE id = ${id} AND source = 'gorgia'
      `;
      if (!rows[0]) { results.push({ id, ok: false, error: 'not found' }); continue; }

      const product = rows[0];
      let images: string[] = [];

      // Парсим images из jsonb
      try {
        images = typeof product.images === 'string'
          ? JSON.parse(product.images)
          : (Array.isArray(product.images) ? product.images : []);
      } catch { images = []; }

      if (!images.length && product.image_url) images = [product.image_url as string];
      if (!images.length) { results.push({ id, ok: false, error: 'no images' }); continue; }

      if (target === 'main') {
        // Обрабатываем только главное фото
        const buf       = await fetchImage(images[0]);
        const processed = await processImage(buf, effect);
        const newUrl    = await uploadBuffer(processed, effect);
        images[0]       = newUrl;
      } else {
        // Обрабатываем все фото
        const newImages: string[] = [];
        for (const imgUrl of images) {
          try {
            const buf       = await fetchImage(imgUrl);
            const processed = await processImage(buf, effect);
            const newUrl    = await uploadBuffer(processed, effect);
            newImages.push(newUrl);
          } catch (e) {
            newImages.push(imgUrl); // при ошибке оставляем оригинал
          }
        }
        images = newImages;
      }

      await sql`
        UPDATE products SET
          image_url  = ${images[0]},
          images     = ${JSON.stringify(images)}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}
      `;

      results.push({ id, ok: true });

      // Пауза чтобы не нагружать CPU
      await new Promise(r => setTimeout(r, 200));
    } catch (e: any) {
      results.push({ id, ok: false, error: String(e) });
    }
  }

  const ok  = results.filter(r =>  r.ok).length;
  const err = results.filter(r => !r.ok).length;
  return NextResponse.json({ ok, err, results });
}