import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import sql from '@/lib/db';
import { ensureSupportTables, supportConfig, tg, MAX_TEXT } from '@/lib/support';
import { folderFor, putSupportFile } from '@/lib/support-storage';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf',
};

/**
 * Файл оператора из Telegram → в бакет, в папку разговора.
 *
 * Ссылку Telegram на файл посетителю отдать нельзя: в ней зашит токен
 * бота. Поэтому сервер скачивает файл сам и кладёт к себе. Ботам Telegram
 * отдаёт файлы до 20 МБ — больше скачать не получится.
 */
async function mirrorFile(fileId: string, mime: string, sid: string): Promise<string> {
  const f = await tg<{ file_path: string; file_size?: number }>('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${supportConfig().token}/${f.file_path}`);
  if (!res.ok) throw new Error(`не удалось скачать файл из Telegram: ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  return putSupportFile(folderFor(sid), body, mime, MIME_EXT[mime] || 'bin');
}

/**
 * Webhook Telegram: ответы оператора из тем группы поддержки.
 *
 * Проверки по порядку — любая не прошла, запрос тихо игнорируется:
 * 1. Секретный заголовок. Telegram присылает его в каждом запросе, если
 *    вебхук установлен с secret_token. Без проверки любой мог бы слать
 *    сюда поддельные «ответы оператора».
 * 2. Чат — только группа поддержки. Сообщения из других чатов бота
 *    сюда не относятся.
 * 3. Сообщение из темы, за которой закреплён разговор.
 *
 * Отвечаем Telegram всегда 200: на ошибку он будет повторять доставку
 * одного и того же сообщения до бесконечности.
 */

export const runtime = 'nodejs';

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const CLOSED_TEXT: Record<string, string> = {
  ru: 'Разговор завершён. Если появятся вопросы — просто напишите снова.',
  en: 'The conversation is closed. If you have more questions, just write again.',
  ka: 'საუბარი დასრულდა. თუ კიდევ გაქვთ კითხვა, უბრალოდ მოგვწერეთ.',
};

export async function POST(req: NextRequest) {
  const cfg = supportConfig();
  const got = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!cfg.secret || !sameSecret(got, cfg.secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const m = update?.message;
  if (!m || String(m.chat?.id) !== String(cfg.chatId) || !m.message_thread_id) {
    return NextResponse.json({ ok: true });
  }
  if (m.from?.is_bot) return NextResponse.json({ ok: true });   // свои же сообщения бота

  try {
    await ensureSupportTables();
    const [t] = await sql`SELECT id, sid, locale, status FROM support_threads WHERE tg_topic_id = ${m.message_thread_id}`;
    if (!t) return NextResponse.json({ ok: true });

    const text = String(m.text ?? m.caption ?? '').trim();

    if (/^\/close(@\w+)?$/i.test(text)) {
      await sql`INSERT INTO support_messages (thread_id, direction, text)
                VALUES (${t.id}, 'out', ${CLOSED_TEXT[t.locale] || CLOSED_TEXT.ru})`;
      await sql`UPDATE support_threads SET status = 'closed', last_at = NOW() WHERE id = ${t.id}`;
      await tg('closeForumTopic', { chat_id: cfg.chatId, message_thread_id: m.message_thread_id }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    // Фото — берём самый крупный размер; документ — только картинки и PDF
    let attachment: string | null = null;
    const doc = m.document;
    if (Array.isArray(m.photo) && m.photo.length) {
      attachment = await mirrorFile(m.photo[m.photo.length - 1].file_id, 'image/jpeg', t.sid);
    } else if (doc && MIME_EXT[doc.mime_type]) {
      attachment = await mirrorFile(doc.file_id, doc.mime_type, t.sid);
    }

    if (!text && !attachment) {
      // Голосовые, видео, стикеры до сайта не доходят — предупреждаем оператора
      await tg('sendMessage', {
        chat_id: cfg.chatId, message_thread_id: m.message_thread_id,
        text: '⚠️ На сайт уходят текст, фото и PDF. Голосовые, видео и стикеры посетитель не увидит.',
      }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    await sql`INSERT INTO support_messages (thread_id, direction, text, attachment_url)
              VALUES (${t.id}, 'out', ${text.slice(0, MAX_TEXT)}, ${attachment})`;
    await sql`UPDATE support_threads SET last_at = NOW(), status = 'open' WHERE id = ${t.id}`;
  } catch (e: any) {
    console.error('telegram webhook:', e?.message);
  }
  return NextResponse.json({ ok: true });
}
