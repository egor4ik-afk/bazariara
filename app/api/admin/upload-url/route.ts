import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

/**
 * Подписанная ссылка для загрузки файла НАПРЯМУЮ в Yandex Object Storage.
 *
 * Зачем это отдельно от /api/admin/upload.
 *
 * Обычный роут принимает файл телом запроса: браузер → функция Vercel → S3.
 * У serverless-функции жёсткий лимит тела — 4.5 МБ, и обойти его нельзя
 * никакими настройками. Именно поэтому видео через него не проходит:
 * дело не в бакете (туда влезет что угодно), а в участке пути между
 * браузером и функцией.
 *
 * Здесь функция отдаёт только подпись — несколько сотен байт. Сам файл
 * браузер кладёт в бакет сам, минуя Vercel, и размер перестаёт иметь
 * значение.
 *
 * Для картинок продолжаем использовать /api/admin/upload: там сервер
 * конвертирует HEIC, применяет EXIF-поворот и жмёт до 2000px, а при
 * прямой загрузке этого сделать негде.
 */

const s3 = new S3Client({
  region: process.env.YANDEX_REGION || 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId:     process.env.YANDEX_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET    = process.env.YANDEX_BUCKET_NAME || 'izipost';
const S3_PREFIX = 'bazariara';
const CDN_URL   = 'https://cdn.relaxdev.ru/bazariara';

/** Что разрешаем лить напрямую. Картинки сознательно не включены. */
const ALLOWED: Record<string, string> = {
  mp4:  'video/mp4',
  webm: 'video/webm',
  mov:  'video/quicktime',
  m4v:  'video/x-m4v',
  pdf:  'application/pdf',
};

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { filename, size } = await req.json();

  const ext = String(filename || '').split('.').pop()?.toLowerCase() || '';
  const contentType = ALLOWED[ext];

  if (!contentType) {
    return NextResponse.json(
      { error: `Формат .${ext} нельзя загружать напрямую. Картинки идут через /api/admin/upload.` },
      { status: 415 }
    );
  }

  if (size && Number(size) > MAX_BYTES) {
    return NextResponse.json(
      { error: `Файл больше ${MAX_BYTES / 1048576} МБ. Для длинных роликов лучше YouTube: он сам раздаёт нужное качество.` },
      { status: 413 }
    );
  }

  const safeName = String(filename)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 60);
  const key = `${S3_PREFIX}/media/${Date.now()}_${safeName}.${ext}`;

  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
      }),
      // 15 минут на закачку; тип файла — в подписи, чтобы по ссылке нельзя
      // было залить файл другого типа
      { expiresIn: 900, signableHeaders: new Set(['content-type']) }
    );

    return NextResponse.json({
      uploadUrl,
      contentType,
      publicUrl: `${CDN_URL}/media/${key.split('/').pop()}`,
    });
  } catch (e: any) {
    console.error('presign error:', e?.message);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
