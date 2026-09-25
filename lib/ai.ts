/**
 * lib/ai.ts — единый клиент OpenCode Zen для всего проекта.
 *
 * Почему прежняя версия не работала и деньги уходили в Yandex.
 * Причин было четыре, и каждая по отдельности отправляла запрос в фолбэк:
 *
 * 1. Форма товара явно передавала `provider: 'yandex'` — OpenCode даже
 *    не пробовался. Это главная причина счёта в Yandex.
 * 2. Не было заголовка `x-opencode-session`. Zen требует стабильный ID
 *    разговора и без него отвечает MissingSessionID. SDK `openai` этот
 *    заголовок не шлёт.
 * 3. Ключ читался из OPENCODE_API_KEY, а в вашем рабочем роутере —
 *    OPENCODE_ZEN_API_KEY. Читаем оба.
 * 4. Модели `deepseek-v4-pro`, `glm-5.1`, `kimi-k2.5` — не те, что
 *    работают в рабочем роутере (`deepseek-v4-flash`, `glm-5.2`,
 *    `kimi-k2.7-code`). Вынесены в переменную окружения.
 *
 * И любая ошибка молча падала в Yandex — поэтому снаружи всё «работало»,
 * а по счёту было видно, что нет. Теперь фолбэк на Yandex выключен
 * по умолчанию, и в ответе всегда видно, кто именно ответил.
 */

import { randomUUID } from 'node:crypto';

const DEFAULT_API_URL = 'https://opencode.ai/zen/go/v1/chat/completions';
const ENV_STUB = 'auto-generated-stub-for-build';

function readEnv(name: string): string | null {
  const raw = process.env[name] ?? '';
  if (!raw || raw === ENV_STUB) return null;
  return raw.trim();
}

function envList(name: string, fallback: string[]): string[] {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
}

export const AI_MODELS = () =>
  envList('ZEN_MODELS', ['deepseek-v4-flash', 'glm-5.2', 'kimi-k2.7-code']);

/** kimi принимает только temperature = 1 и отвечает invalid_request_error на остальное. */
const FIXED_TEMPERATURE = () =>
  new Set(envList('ZEN_FIXED_TEMPERATURE_MODELS', ['kimi-k2.7-code']));

export function aiKeyName(): string | null {
  if (readEnv('OPENCODE_ZEN_API_KEY')) return 'OPENCODE_ZEN_API_KEY';
  if (readEnv('OPENCODE_API_KEY')) return 'OPENCODE_API_KEY';
  return null;
}

function apiKey(): string {
  const key = readEnv('OPENCODE_ZEN_API_KEY') || readEnv('OPENCODE_API_KEY');
  if (!key) {
    throw Object.assign(
      new Error('Не задан ключ OpenCode: добавьте OPENCODE_ZEN_API_KEY в Environment Variables на Vercel'),
      { fatal: true }
    );
  }
  return key;
}

export function yandexFallbackEnabled(): boolean {
  return readEnv('AI_ALLOW_YANDEX_FALLBACK') === '1';
}

export type AIResult = {
  text: string;
  provider: 'opencode';
  model: string;
  ms: number;
  /** модели, которые не сработали до этой, — для отладки в интерфейсе */
  skipped: string[];
};

const TIMEOUT_MS = 60_000;

/**
 * Лимит ответа с запасом под размышления.
 *
 * deepseek-v4-flash и glm-5.2 — рассуждающие модели: сначала думают, потом
 * пишут ответ, и размышления тратят ТОТ ЖЕ max_tokens. При лимите 400–2500
 * весь бюджет уходил на размышления, content приходил пустым с
 * finish_reason=length — в логах это «пустой ответ». Kimi думает меньше,
 * успевал начать JSON, но обрывался на середине — «No JSON found».
 *
 * Неиспользованные токены не оплачиваются, поэтому запас бесплатный.
 */
const MIN_TOKENS = 6000;
const MAX_TOKENS_CAP = 16000;

/** Некоторые провайдеры отдают content массивом частей, а не строкой. */
function readContent(msg: any): string {
  const c = msg?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('');
  return '';
}

/**
 * Один вызов = один разговор: sessionId создаётся до цикла и переживает
 * фолбэк на следующую модель, как требует маршрутизация Zen.
 */
export async function aiChat(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<AIResult> {
  const key = apiKey();
  const url = readEnv('ZEN_API_URL') ?? DEFAULT_API_URL;
  const sessionId = randomUUID();
  const fixed = FIXED_TEMPERATURE();
  const skipped: string[] = [];

  for (const model of AI_MODELS()) {
    const started = Date.now();
    let allowTemperature = !fixed.has(model);
    let budget = Math.min(MAX_TOKENS_CAP, Math.max(MIN_TOKENS, opts.maxTokens ?? 0));

    // До трёх попыток на модель: без temperature, если она на неё ругнулась,
    // и с удвоенным лимитом, если ответ съели размышления.
    for (let attempt = 0; attempt < 3; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

      try {
        const payload: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
          ],
          max_tokens: budget,
        };
        if (allowTemperature) payload.temperature = opts.temperature ?? 0.3;

        const res = await fetch(url, {
          method: 'POST',
          signal: ctrl.signal,
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'x-opencode-session': sessionId,
          },
          body: JSON.stringify(payload),
        });

        const raw = await res.text();
        let data: any;
        try { data = JSON.parse(raw); }
        catch { throw new Error(`не-JSON ответ: ${raw.slice(0, 150)}`); }

        if (!res.ok) {
          const msg = data?.error?.message || data?.error || `HTTP ${res.status}`;
          const flat = typeof msg === 'string' ? msg : JSON.stringify(msg);

          if (allowTemperature && /temperature/i.test(flat)) {
            allowTemperature = false;
            continue;
          }

          // Ключ, баланс, доступ — перебор моделей не поможет
          if (res.status === 401 || res.status === 403 ||
              /insufficient balance|credits|invalid api key|unauthorized/i.test(flat)) {
            throw Object.assign(new Error(`OpenCode: ${flat}`), { fatal: true });
          }
          throw new Error(flat);
        }

        const choice = data?.choices?.[0];
        const text = readContent(choice?.message).trim();
        const finish = choice?.finish_reason;

        if (!text) {
          // Лимит кончился на размышлениях — даём той же модели вдвое больше.
          // Переход к следующей модели тут не помогает: они такие же.
          if (finish === 'length' && budget < MAX_TOKENS_CAP) {
            budget = Math.min(MAX_TOKENS_CAP, budget * 2);
            console.warn(`[AI] ${model}: лимит ушёл на размышления, повтор с max_tokens=${budget}`);
            continue;
          }
          const thought = Boolean(choice?.message?.reasoning_content || choice?.message?.reasoning);
          throw new Error(`пустой ответ (finish=${finish ?? '?'}${thought ? ', только размышления' : ''})`);
        }

        // Ответ оборвался посреди текста — для JSON это гарантированная
        // ошибка разбора. Повторяем с большим лимитом, а не отдаём обрубок.
        if (finish === 'length' && budget < MAX_TOKENS_CAP) {
          budget = Math.min(MAX_TOKENS_CAP, budget * 2);
          console.warn(`[AI] ${model}: ответ оборван, повтор с max_tokens=${budget}`);
          continue;
        }

        return { text, provider: 'opencode', model, ms: Date.now() - started, skipped };
      } catch (e: any) {
        if (e?.fatal) throw e;
        const why = e?.name === 'AbortError' ? `таймаут ${TIMEOUT_MS / 1000}с` : e?.message;
        console.warn(`[AI] ${model}: ${why}`);
        skipped.push(`${model}: ${String(why).slice(0, 80)}`);
        break;   // к следующей модели
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw new Error(`Ни одна модель OpenCode не ответила. ${skipped.join(' · ')}`);
}

/** Достаёт JSON из ответа модели, даже если вокруг есть текст или ```-фенсы. */
export function parseJsonLoose<T = any>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('в ответе нет JSON');
  return JSON.parse(body.slice(start, end + 1));
}
