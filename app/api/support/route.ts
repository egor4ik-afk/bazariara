import { NextRequest, NextResponse, after } from 'next/server';
import { randomBytes } from 'node:crypto';
import sql from '@/lib/db';
import { ensureSupportTables, supportConfig, tg, SUPPORT_COOKIE, MAX_TEXT } from '@/lib/support';
import { isOwnAttachment } from '@/lib/support-storage';
import { deliverAttachment } from '@/lib/support-deliver';

/**
 * Чат поддержки со стороны посетителя.
 *
 *   GET  ?after=<id>  — сообщения разговора новее указанного
 *   POST { text, name?, contact? } — отправить сообщение
 *
 * Разговор привязан к httpOnly-куке со случайным идентификатором.
 * Номер разговора наружу не отдаётся и в запросах не принимается —
 * иначе перебором номеров можно было бы читать чужую переписку.
 */

export const runtime = 'nodejs';
// Раньше лимит не был задан, и отправка картинки в Telegram не укладывалась
// в короткий лимит по умолчанию — Vercel отдавал HTML-страницу ошибки, и
// окно чата падало на разборе ответа: «Unexpected token '<'».
export const maxDuration = 30;

const LIMIT_PER_MINUTE = 8;
const LIMIT_PER_DAY = 150;

type Thread = {
  id: number; sid: string; tg_topic_id: number | null; visitor_name: string | null;
  contact: string | null; locale: string; page_url: string | null; status: string;
};

async function threadBySid(sid: string | undefined): Promise<Thread | null> {
  if (!sid) return null;
  const [t] = await sql`SELECT * FROM support_threads WHERE sid = ${sid}`;
  return (t as Thread) ?? null;
}

export async function GET(req: NextRequest) {
  await ensureSupportTables();
  const t = await threadBySid(req.cookies.get(SUPPORT_COOKIE)?.value);
  if (!t) return NextResponse.json({ messages: [], status: 'none' });

  const after = Number(req.nextUrl.searchParams.get('after') || 0);
  const messages = await sql`
    SELECT id, direction, text, attachment_url, created_at FROM support_messages
    WHERE thread_id = ${t.id} AND id > ${after}
    ORDER BY id LIMIT 200
  `;
  return NextResponse.json({ messages, status: t.status });
}

export async function POST(req: NextRequest) {
  const cfg = supportConfig();
  if (!cfg.ready) {
    return NextResponse.json({ error: 'Чат временно недоступен' }, { status: 503 });
  }
  await ensureSupportTables();

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').trim();
  const attachment = String(body.attachment_url || '').trim() || null;
  if (!text && !attachment) return NextResponse.json({ error: 'Пустое сообщение' }, { status: 400 });
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: `Не больше ${MAX_TEXT} символов` }, { status: 413 });
  }
  // Honeypot: скрытое поле, которое заполняют только боты
  if (body.website) return NextResponse.json({ ok: true, messages: [] });

  let sid = req.cookies.get(SUPPORT_COOKIE)?.value;
  let t: Thread | null = await threadBySid(sid);

  // Вложение принимаем, только если файл лежит в папке ЭТОГО посетителя.
  // Иначе через чат можно было бы переслать оператору любую внешнюю ссылку.
  if (attachment && (!sid || !isOwnAttachment(attachment, sid))) {
    return NextResponse.json({ error: 'Вложение не найдено' }, { status: 400 });
  }

  // Защита от флуда — счёт по разговору
  if (t) {
    const [{ m, d }] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute')::int AS m,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')::int    AS d
      FROM support_messages WHERE thread_id = ${t.id} AND direction = 'in'
    `;
    if (m >= LIMIT_PER_MINUTE || d >= LIMIT_PER_DAY) {
      return NextResponse.json({ error: 'Слишком много сообщений, подождите немного' }, { status: 429 });
    }
  }

  const name = String(body.name || '').trim().slice(0, 80) || null;
  const contact = String(body.contact || '').trim().slice(0, 120) || null;
  const locale = ['ru', 'en', 'ka'].includes(body.locale) ? body.locale : 'ru';
  const page = String(body.page || '').slice(0, 300) || null;

  try {
    if (!t) {
      // Если первым был скриншот, кука уже выдана при загрузке файла, и
      // файл лежит в её папке. Новая кука здесь оторвала бы файл от разговора.
      sid = sid || randomBytes(24).toString('hex');
      t = (await sql`
        INSERT INTO support_threads (sid, visitor_name, contact, locale, page_url)
        VALUES (${sid}, ${name}, ${contact}, ${locale}, ${page})
        RETURNING *
      `)[0] as Thread;
    } else if ((name && !t.visitor_name) || (contact && !t.contact)) {
      t = (await sql`
        UPDATE support_threads SET
          visitor_name = COALESCE(visitor_name, ${name}), contact = COALESCE(contact, ${contact})
        WHERE id = ${t.id} RETURNING *
      `)[0] as Thread;
    }

    // Тема в Telegram — при первом сообщении
    if (!t.tg_topic_id) {
      const title = `#${t.id} · ${t.visitor_name || 'Гость'}${t.contact ? ` · ${t.contact}` : ''}`.slice(0, 120);
      const topic = await tg<{ message_thread_id: number }>('createForumTopic', {
        chat_id: cfg.chatId, name: title,
      });
      t = (await sql`
        UPDATE support_threads SET tg_topic_id = ${topic.message_thread_id}
        WHERE id = ${t.id} RETURNING *
      `)[0] as Thread;
      // Карточка посетителя в начале темы — всё, что о нём известно
      const card = [
        `Новый разговор #${t.id}`,
        t.visitor_name ? `Имя: ${t.visitor_name}` : null,
        t.contact ? `Контакт: ${t.contact}` : null,
        `Язык: ${t.locale}`,
        t.page_url ? `Страница: ${t.page_url}` : null,
        '',
        'Пишите ответ прямо в эту тему — он появится у посетителя на сайте.',
        '/close — закрыть разговор.',
      ].filter((l) => l !== null).join('\n');
      await tg('sendMessage', { chat_id: cfg.chatId, message_thread_id: t.tg_topic_id, text: card });
    }

    // Оператор закрыл разговор командой /close, а посетитель пишет снова —
    // тему нужно открыть, иначе Telegram отклонит сообщение (TOPIC_CLOSED)
    if (t.status === 'closed') {
      await tg('reopenForumTopic', { chat_id: cfg.chatId, message_thread_id: t.tg_topic_id }).catch(() => {});
    }

    // Текст отправляем без parse_mode: разметку из сообщения посетителя
    // Telegram иначе попытается интерпретировать
    // Текст — сразу: он уходит быстро, и если Telegram откажет, посетитель
    // увидит ошибку, а сообщение не сохранится «вникуда»
    if (!attachment) {
      await tg('sendMessage', { chat_id: cfg.chatId, message_thread_id: t.tg_topic_id, text });
    }

    const [msg] = await sql`
      INSERT INTO support_messages (thread_id, direction, text, attachment_url)
      VALUES (${t.id}, 'in', ${text}, ${attachment})
      RETURNING id, direction, text, attachment_url, created_at
    `;
    await sql`UPDATE support_threads SET last_at = NOW(), status = 'open' WHERE id = ${t.id}`;

    /*
      Доставка в Telegram — после ответа посетителю (after).

      С картинкой это долго: Telegram сам скачивает файл по ссылке, а если
      не выходит отправить фото, файл уходит документом — ещё один запрос.
      Раньше посетитель ждал всё это, и на Vercel функция не укладывалась
      во время. Теперь сообщение сохранено и сразу видно в окне, а
      доставка идёт следом. Если Telegram откажет — ошибка будет в логах.
    */
    const topicId = t.tg_topic_id;
    // Вложение — после ответа посетителю: чтение из бакета и загрузка
    // в Telegram занимают время, посетитель ждать не должен
    if (attachment) {
      const args = { chatId: cfg.chatId, topicId: t.tg_topic_id!, threadId: t.id, url: attachment, text };
      after(() => deliverAttachment(args).catch((e) =>
        console.error(`support: вложение не доставлено (разговор #${args.threadId}):`, e?.message)));
    }

    const res = NextResponse.json({ ok: true, message: msg });
    res.cookies.set(SUPPORT_COOKIE, sid!, {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 180,
    });
    return res;
  } catch (e: any) {
    console.error('support POST:', e?.message);
    return NextResponse.json({ error: 'Не удалось отправить. Попробуйте ещё раз.' }, { status: 502 });
  }
}
