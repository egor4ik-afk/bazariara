import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

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

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const filename  = req.nextUrl.searchParams.get('filename') || 'upload.jpg';
  const timestamp = Date.now();
  const safeName  = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key       = `${S3_PREFIX}/admin/${timestamp}_${safeName}`;
  const body      = Buffer.from(await req.arrayBuffer());

  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const contentTypeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  };
  const contentType = contentTypeMap[ext] || 'image/jpeg';

  try {
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        body,
      ContentType: contentType,
      ACL:         'public-read',
    }));
  } catch (e: any) {
    console.error('S3 upload error:', e?.message);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }

  // S3:  https://storage.yandexcloud.net/izipost/bazariara/admin/xxx.jpg
  // CDN: https://cdn.relaxdev.ru/bazariara/admin/xxx.jpg
  return NextResponse.json({ url: `${CDN_URL}/admin/${timestamp}_${safeName}` });
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