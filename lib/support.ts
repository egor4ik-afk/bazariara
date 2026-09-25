/**
 * Чат поддержки: посетитель пишет на сайте, оператор отвечает в Telegram.
 *
 * Как устроено
 * ────────────
 * Переписка идёт в отдельной группе Telegram с включёнными ТЕМАМИ
 * (TELEGRAM_SUPPORT_CHAT_ID). На каждого посетителя бот заводит тему,
 * оператор просто пишет в неё — без «ответить на сообщение». Webhook
 * (/api/telegram/webhook) находит по номеру темы, чей это разговор, и
 * кладёт ответ в базу. Окно на сайте забирает новые сообщения опросом.
 *
 * Почему опрос, а не WebSocket: на Vercel функции живут секунды,
 * постоянное соединение держать нечем. Окно спрашивает раз в 4 секунды,
 * пока открыто, и раз в 30 — пока свёрнуто.
 *
 * Уведомления о заказах остаются в TELEGRAM_CHAT_ID — переписка с
 * ними не смешивается.
 */

import { createHash } from 'node:crypto';
import sql from '@/lib/db';

export const SUPPORT_COOKIE = 'support_sid';
export const MAX_TEXT = 2000;

let ensured = false;

/** Таблицы создаются при первом обращении — отдельная миграция не нужна. */
export async function ensureSupportTables() {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS support_threads (
      id           SERIAL PRIMARY KEY,
      sid          text UNIQUE NOT NULL,
      tg_topic_id  int,
      visitor_name text,
      contact      text,
      locale       text,
      page_url     text,
      status       text NOT NULL DEFAULT 'open',
      created_at   timestamptz NOT NULL DEFAULT NOW(),
      last_at      timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS support_threads_topic ON support_threads (tg_topic_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS support_messages (
      id          SERIAL PRIMARY KEY,
      thread_id   int NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
      direction   text NOT NULL,            -- 'in' от посетителя, 'out' от оператора
      text        text NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS support_messages_thread ON support_messages (thread_id, id)`;
  // Вложение: картинка или PDF в бакете. Текст при этом может быть пустым.
  await sql`ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_url text`;
  // Учёт загрузок по IP — от анонимного спама файлами в бакет
  await sql`
    CREATE TABLE IF NOT EXISTS support_uploads (
      id         SERIAL PRIMARY KEY,
      ip         text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS support_uploads_ip ON support_uploads (ip, created_at)`;
  ensured = true;
}

/**
 * Секрет вебхука выводится из токена бота — отдельную переменную
 * задавать не нужно.
 *
 * Сам секрет обязателен: Telegram присылает его в каждом запросе, и так
 * мы отличаем настоящий Telegram от подделки. Без проверки любой, кто
 * знает адрес /api/telegram/webhook, мог бы подсунуть посетителю
 * «ответ поддержки» со ссылкой на оплату.
 *
 * Токен и так секретный, а хеш от него не угадать и не обратить.
 * Сменили токен бота — секрет сменится сам, достаточно переустановить
 * вебхук кнопкой в админке.
 */
function webhookSecret(token: string): string {
  if (!token) return '';
  return createHash('sha256').update(`bazariara-support-webhook:${token}`).digest('hex').slice(0, 48);
}

/**
 * У поддержки СВОЙ бот. Один бот держит только один вебхук: общий с
 * другим проектом (RelaxDev) бот означал бы, что установка вебхука здесь
 * отключает чат там — так однажды и случилось. Заказы по-прежнему шлёт
 * бот из TELEGRAM_BOT_TOKEN, с поддержкой они не пересекаются.
 */
export function supportConfig() {
  const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID || '';
  const secret = webhookSecret(token);
  return { token, chatId, secret, ready: Boolean(token && chatId) };
}

/** Вызов Bot API. Ошибка Telegram — это исключение с его текстом. */
export async function tg<T = any>(method: string, params: Record<string, unknown>): Promise<T> {
  const { token } = supportConfig();
  if (!token) throw new Error('Не задан TELEGRAM_SUPPORT_BOT_TOKEN');
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) throw new Error(`Telegram ${method}: ${data?.description || res.status}`);
  return data.result as T;
}

/** Вызов Bot API с файлом (multipart). Файл уходит байтами, а не ссылкой. */
export async function tgUpload<T = any>(
  method: 'sendPhoto' | 'sendDocument',
  params: Record<string, string | number | undefined>,
  file: { body: Buffer; contentType: string; name: string },
): Promise<T> {
  const { token } = supportConfig();
  if (!token) throw new Error('Не задан TELEGRAM_SUPPORT_BOT_TOKEN');
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') form.append(k, String(v));
  form.append(method === 'sendPhoto' ? 'photo' : 'document',
              new Blob([new Uint8Array(file.body)], { type: file.contentType }), file.name);
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body: form, cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) throw new Error(`Telegram ${method}: ${data?.description || res.status}`);
  return data.result as T;
}
