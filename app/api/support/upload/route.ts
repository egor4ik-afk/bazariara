import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import sql from '@/lib/db';
import { ensureSupportTables, SUPPORT_COOKIE } from '@/lib/support';
import { presignSupportUpload, ALLOWED_TYPES, MAX_UPLOAD } from '@/lib/support-storage';

/**
 * Подписанная ссылка для загрузки вложения посетителем.
 *
 * Файл идёт из браузера прямо в бакет. Эндпоинт доступен без
 * авторизации — это чат для любого посетителя, — поэтому ограничения
 * жёсткие: только картинки и PDF, до 10 МБ, тип и размер зашиты в
 * подпись, не больше 20 загрузок в час с одного IP.
 */

export const runtime = 'nodejs';

const PER_HOUR = 20;

export async function POST(req: NextRequest) {
  await ensureSupportTables();

  const { contentType, size } = await req.json().catch(() => ({}));
  if (!ALLOWED_TYPES[contentType]) {
    return NextResponse.json(
      { error: 'Можно прикрепить картинку (JPG, PNG, WebP, GIF) или PDF' }, { status: 415 }
    );
  }
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_UPLOAD) {
    return NextResponse.json({ error: 'Файл больше 10 МБ' }, { status: 413 });
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM support_uploads
    WHERE ip = ${ip} AND created_at > NOW() - INTERVAL '1 hour'
  `;
  if (n >= PER_HOUR) {
    return NextResponse.json({ error: 'Слишком много файлов, попробуйте позже' }, { status: 429 });
  }
  await sql`INSERT INTO support_uploads (ip) VALUES (${ip})`;

  // Первым сообщением может быть сразу скриншот — тогда кука ещё не выдана
  let sid = req.cookies.get(SUPPORT_COOKIE)?.value;
  const fresh = !sid;
  if (!sid) sid = randomBytes(24).toString('hex');

  try {
    const { uploadUrl, fileUrl } = await presignSupportUpload(sid, contentType, bytes);
    const res = NextResponse.json({ uploadUrl, fileUrl });
    if (fresh) {
      res.cookies.set(SUPPORT_COOKIE, sid, {
        httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 180,
      });
    }
    return res;
  } catch (e: any) {
    console.error('support upload:', e?.message);
    return NextResponse.json({ error: 'Не удалось подготовить загрузку' }, { status: 502 });
  }
}
