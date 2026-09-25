import postgres from 'postgres';

/**
 * Подключение к Neon из serverless-функций Vercel.
 *
 * Откуда красная ошибка CONNECT_TIMEOUT в логах. Три причины сложились:
 *
 * 1. max: 10. Каждая функция Vercel — отдельный процесс, и каждый держал
 *    пул до 10 соединений. При нескольких одновременных запросах это
 *    десятки соединений к пулеру Neon, и новые встают в очередь, пока
 *    не упрутся в таймаут. В serverless нужен max: 1 — параллельность
 *    обеспечивают сами инстансы функций, а не пул внутри одного.
 *
 * 2. prepare не отключён. Адрес в DATABASE_URL — `-pooler` (PgBouncer в
 *    режиме transaction). Он не держит prepared statements между
 *    транзакциями, и postgres.js по умолчанию на этом спотыкается.
 *
 * 3. Холодный старт Neon. Если база простаивала, компьют засыпает, и
 *    первое подключение ждёт его пробуждения несколько секунд. Именно
 *    поэтому ошибка возникает при фоновой ревалидации кеша: она часто
 *    приходится на момент после простоя. connect_timeout поднят до 15с,
 *    а withRetry даёт одну повторную попытку.
 *
 * При этом сайт не падал: при ошибке ревалидации unstable_cache отдаёт
 * прежние данные. Красная строка в логе была именно про неудачную
 * фоновую попытку обновить кеш, а не про ошибку для посетителя.
 */

function getSafeUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || typeof url !== 'string' || !url.startsWith('postgres')) {
    return 'postgres://dummy:dummy@localhost:5432/dummy';
  }
  return url;
}

const sql = postgres(getSafeUrl(), {
  ssl: 'require',
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  // Уведомления Postgres вроде «column already exists, skipping» от
  // ADD COLUMN IF NOT EXISTS — не ошибки. Драйвер по умолчанию печатает
  // каждое, и логи Vercel засорялись на каждом сохранении статьи.
  onnotice: () => {},
});

/**
 * Одна повторная попытка на сетевых ошибках подключения. Ошибки SQL
 * (синтаксис, нарушение ограничений) не повторяются — повтор их не лечит.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      last = e;
      const transient = /CONNECT_TIMEOUT|ECONNRESET|ETIMEDOUT|CONNECTION_CLOSED|terminating connection/i
        .test(String(e?.code || e?.message || ''));
      if (!transient || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

export default sql;
