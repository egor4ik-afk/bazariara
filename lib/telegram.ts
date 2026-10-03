// FILE: lib/telegram.ts
//
// Все запросы к Telegram Bot API идут только через этот модуль.
//
// С сервера в России api.telegram.org напрямую не открывается, поэтому
// запросы уходят через HTTP-прокси из TG_PROXY_URL (например,
// http://38.180.250.194:3128). Для https это туннель CONNECT: прокси видит
// только адрес api.telegram.org:443, а токен бота и текст сообщений идут
// внутри TLS и ему не видны. Без TG_PROXY_URL — напрямую (локальная разработка).
//
// Свой fetch из пакета undici, а не глобальный: глобальный fetch в Next
// перехвачен под кэширование и не обязан пропускать прокси-агент.
//
// Только для серверного кода (server actions, route handlers на nodejs).

import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from 'undici';
import { runtimeEnv } from '@/lib/env';

const DEFAULT_API = 'https://api.telegram.org';

/** TG_API_BASE — только для тестов (свой сервер Bot API); всё, что не похоже на адрес, игнорируем. */
function apiBase(): string {
  const v = runtimeEnv('TG_API_BASE');
  return /^https?:\/\/[^\s/]+/.test(v) ? v.replace(/\/+$/, '') : DEFAULT_API;
}

function proxyUrl(): string {
  return runtimeEnv('TG_PROXY_URL');
}

let agent: { url: string; dispatcher: Dispatcher } | null = null;

function proxyDispatcher(): Dispatcher | undefined {
  const url = proxyUrl();
  if (!url) return undefined;
  if (!/^https?:\/\/[^\s]+$/.test(url)) {
    throw new Error(`TG_PROXY_URL должен быть вида http://host:port, а сейчас «${url}»`);
  }
  if (agent?.url !== url) agent = { url, dispatcher: new ProxyAgent(url) };
  return agent.dispatcher;
}

/** Причина сетевой ошибки без токена: «fetch failed» сам по себе ничего не говорит. */
function why(e: unknown): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'нет ответа (таймаут)';
  if (err?.message?.startsWith('TG_PROXY_URL')) return err.message;
  const c = err?.cause;
  return [c?.code, c?.message || err?.message].filter(Boolean).join(' ') || 'неизвестная ошибка';
}

type TgInit = {
  /** Тело JSON — для обычных методов. */
  json?: unknown;
  /** Multipart — для отправки файлов. */
  form?: FormData;
  timeoutMs?: number;
};

/**
 * Низкоуровневый запрос: path без домена — `bot<token>/<method>` или
 * `file/bot<token>/<file_path>`. Возвращает ответ как есть.
 */
export async function tgFetch(path: string, init: TgInit = {}) {
  const headers: Record<string, string> = {};
  let body: string | Buffer | undefined;

  if (init.form) {
    // FormData из глобального окружения и fetch из пакета undici — разные
    // реализации, и смешивать их ненадёжно. Поэтому multipart собираем сами
    // (стандартный Response умеет это вместе с boundary) и шлём байтами.
    const packed = new globalThis.Response(init.form);
    body = Buffer.from(await packed.arrayBuffer());
    headers['content-type'] = packed.headers.get('content-type') || 'multipart/form-data';
  } else if (init.json !== undefined) {
    body = JSON.stringify(init.json);
    headers['content-type'] = 'application/json';
  }

  try {
    return await undiciFetch(`${apiBase()}/${path.replace(/^\/+/, '')}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body,
      dispatcher: proxyDispatcher(),
      // Без таймаута зависший прокси держал бы оформление заказа.
      signal: AbortSignal.timeout(init.timeoutMs ?? 10_000),
    });
  } catch (e) {
    const via = proxyUrl() ? ` через прокси ${proxyUrl()}` : ' напрямую';
    throw new Error(`Telegram недоступен${via}: ${why(e)}`);
  }
}

/** Вызов метода Bot API. Ошибка Telegram или сети — исключение с понятным текстом. */
export async function tgCall<T = any>(
  token: string,
  method: string,
  params: Record<string, unknown>,
  timeoutMs?: number,
): Promise<T> {
  if (!token) throw new Error(`Telegram ${method}: не задан токен бота`);
  const res = await tgFetch(`bot${token}/${method}`, { json: params, timeoutMs });
  const data: any = await res.json().catch(() => ({}));
  if (!data?.ok) throw new Error(`Telegram ${method}: ${data?.description || `HTTP ${res.status}`}`);
  return data.result as T;
}

/** Вызов метода с файлом (sendPhoto, sendDocument). */
export async function tgCallUpload<T = any>(token: string, method: string, form: FormData, timeoutMs = 30_000): Promise<T> {
  if (!token) throw new Error(`Telegram ${method}: не задан токен бота`);
  const res = await tgFetch(`bot${token}/${method}`, { form, timeoutMs });
  const data: any = await res.json().catch(() => ({}));
  if (!data?.ok) throw new Error(`Telegram ${method}: ${data?.description || `HTTP ${res.status}`}`);
  return data.result as T;
}

/** Скачать файл, присланный боту (после getFile). Telegram отдаёт ботам до 20 МБ. */
export async function tgDownload(token: string, filePath: string): Promise<Buffer> {
  const res = await tgFetch(`file/bot${token}/${filePath}`, { timeoutMs: 60_000 });
  if (!res.ok) throw new Error(`не удалось скачать файл из Telegram: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
