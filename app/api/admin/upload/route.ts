// FILE: app/api/admin/upload/route.ts
//
// Загрузка фото в Yandex Object Storage. Адаптировано под Vercel:
//   • runtime = 'nodejs' — sharp не работает на edge
//   • maxDuration — конвертация HEIC на JS занимает 2–5 сек
//   • HEIC декодируется через heic-convert, потому что sharp на Vercel
//     собран без libheif и .heic не читает
//
// Установить: npm i heic-convert && npm i -D @types/heic-convert

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 10;

const s3 = new S3Client({
  region: process.env.YANDEX_REGION || 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId:     process.env.YANDEX_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET    = 'izipost';
const S3_PREFIX = 'bazariara';
const CDN_URL   = 'https://cdn.relaxdev.ru/bazariara';

const ALLOWED  = new Set(['jpg','jpeg','png','webp','gif','heic','heif','avif','tiff','tif','bmp']);
const MAX_SIZE = 4 * 1024 * 1024;   // лимит тела функции на Vercel — 4.5 МБ

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const filename = req.nextUrl.searchParams.get('filename') || 'upload.jpg';
  const ext      = filename.split('.').pop()?.toLowerCase() || 'jpg';

  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: `Неподдерживаемый формат: .${ext}` }, { status: 415 });
  }

  let input = Buffer.from(await req.arrayBuffer());

  if (input.byteLength > MAX_SIZE) {
    return NextResponse.json(
      { error: `Файл ${(input.byteLength / 1048576).toFixed(1)} МБ — больше лимита Vercel (4.5 МБ). Уменьшите фото перед загрузкой.` },
      { status: 413 }
    );
  }

  try {
    // HEIC/HEIF с айфона: sharp на Vercel их не декодирует, идём через JS-декодер
    if (ext === 'heic' || ext === 'heif') {
      const heicConvert = (await import('heic-convert')).default;
      input = Buffer.from(
        await heicConvert({ buffer: input as any, format: 'JPEG', quality: 0.92 })
      );
    }

    // .rotate() без аргументов применяет EXIF-ориентацию — иначе фото с айфона
    // лежат боком. Заодно ужимаем: в бакет уедет 300–600 КБ вместо трёх мегабайт.
    const output = await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    const timestamp = Date.now();
    const safeName  = filename
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 60);
    const key = `${S3_PREFIX}/admin/${timestamp}_${safeName}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        output,
      ContentType: 'image/jpeg',
      ACL:         'public-read',
    }));

    return NextResponse.json({
      url:  `${CDN_URL}/admin/${timestamp}_${safeName}.jpg`,
      size: output.byteLength,
    });
  } catch (e: any) {
    console.error('upload error:', e?.message);
    return NextResponse.json(
      { error: `Не удалось обработать .${ext}: ${e?.message || String(e)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const key = url.replace('https://cdn.relaxdev.ru/', '');
  if (!key || key === url) {
    return NextResponse.json({ error: 'не удалось определить key' }, { status: 400 });
  }

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
