import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import sharp from 'sharp';

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

const RASTER = new Set(['jpg','jpeg','png','webp','gif','heic','heif','avif','tiff','tif','bmp']);

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const filename  = req.nextUrl.searchParams.get('filename') || 'upload.jpg';
  const timestamp = Date.now();
  const ext       = filename.split('.').pop()?.toLowerCase() || 'jpg';

  let body = Buffer.from(await req.arrayBuffer());
  let outExt = ext;
  let contentType = 'image/jpeg';

  if (RASTER.has(ext)) {
    try {
      if ((ext === 'heic' || ext === 'heif') && !sharp.format.heif?.input?.buffer) {
        const heicConvert = require('heic-convert');
        body = Buffer.from(await heicConvert({ buffer: body, format: 'JPEG', quality: 0.9 }));
      }
      // .rotate() без аргументов = применить EXIF-ориентацию айфона и убрать тег
      body = await sharp(body)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
      outExt = 'jpg';
      contentType = 'image/jpeg';
    } catch (e: any) {
      // HEIC не декодировался — см. примечание ниже
      console.error('image convert failed:', e?.message);
      return NextResponse.json(
        { error: `Не удалось обработать файл .${ext}: ${e?.message}` },
        { status: 415 }
      );
    }
  } else {
    return NextResponse.json({ error: `Неподдерживаемый формат: .${ext}` }, { status: 415 });
  }

  const safeName = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const key      = `${S3_PREFIX}/admin/${timestamp}_${safeName}.${outExt}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body,
    ContentType: contentType, ACL: 'public-read',
  }));

  return NextResponse.json({ url: `${CDN_URL}/admin/${timestamp}_${safeName}.${outExt}` });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  // https://cdn.relaxdev.ru/bazariara/admin/xxx.jpg → bazariara/admin/xxx.jpg
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
