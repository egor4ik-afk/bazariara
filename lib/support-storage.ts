/**
 * Хранилище вложений чата поддержки — тот же бакет и CDN, что у фото
 * товаров. Два пути загрузки:
 *
 *  • посетитель → бакет напрямую по подписанной ссылке (presignSupportUpload).
 *    Файл не идёт через функцию Vercel, поэтому её лимит 4.5 МБ не мешает;
 *  • оператор → Telegram → сервер скачивает и кладёт в бакет (putSupportFile).
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomBytes } from 'node:crypto';

const s3 = new S3Client({
  region: process.env.YANDEX_REGION || 'ru-central1',
  endpoint: 'https://storage.yandexcloud.net',
  credentials: {
    accessKeyId:     process.env.YANDEX_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.YANDEX_BUCKET_NAME || 'izipost';
const PREFIX = 'bazariara/support';
export const SUPPORT_CDN = 'https://cdn.relaxdev.ru/bazariara/support';

/** Что принимаем от посетителя. HEIC нет: Telegram его не покажет. */
export const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};
export const MAX_UPLOAD = 10 * 1024 * 1024;

/**
 * Папка разговора в бакете — производная от куки посетителя. Сообщение
 * со ссылкой на файл принимается, только если файл лежит в СВОЕЙ папке:
 * иначе через чат можно было бы подсунуть оператору любую внешнюю ссылку.
 */
export function folderFor(sid: string): string {
  return createHash('sha256').update(sid).digest('hex').slice(0, 20);
}

export function isOwnAttachment(url: string, sid: string): boolean {
  return url.startsWith(`${SUPPORT_CDN}/${folderFor(sid)}/`);
}

/**
 * Подписанная ссылка на загрузку. Тип и точный размер файла входят в
 * подпись: залить по ней можно только тот файл, который заявили, —
 * ни больше, ни другого типа.
 */
export async function presignSupportUpload(sid: string, contentType: string, size: number) {
  const ext = ALLOWED_TYPES[contentType];
  const name = `${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`;
  const key = `${PREFIX}/${folderFor(sid)}/${name}`;
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET, Key: key, ContentType: contentType, ContentLength: size, ACL: 'public-read',
    }),
    {
      expiresIn: 300,
      // Без этого SDK подписывает только размер и host, а тип — нет: по
      // ссылке, выданной под картинку, можно было залить HTML-страницу,
      // и CDN отдал бы её как страницу. Поймано тестом.
      signableHeaders: new Set(['content-type']),
    },
  );
  return { uploadUrl, fileUrl: `${SUPPORT_CDN}/${folderFor(sid)}/${name}` };
}

/** Файл оператора из Telegram — в папку разговора. */
export async function putSupportFile(folder: string, body: Buffer, contentType: string, ext: string) {
  const name = `${Date.now()}_op_${randomBytes(4).toString('hex')}.${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: `${PREFIX}/${folder}/${name}`, Body: body, ContentType: contentType, ACL: 'public-read',
  }));
  return `${SUPPORT_CDN}/${folder}/${name}`;
}

export function isImageUrl(url: string | null | undefined): boolean {
  return !!url && /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
}
