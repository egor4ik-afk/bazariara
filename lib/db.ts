import postgres from 'postgres';

// Вся работа с базой идёт через postgres.js (sql): Prisma в коде не использовался
// ни в одном месте, поэтому её клиент отсюда убран — меньше памяти и быстрее старт.

function getSafeUrl() {
  const url = process.env.DATABASE_URL;
  // The original patch for URL validation is preserved here.
  if (!url || typeof url !== 'string' || !url.startsWith('postgres')) {
    return 'postgres://dummy:dummy@localhost:5432/dummy';
  }
  try {
    new URL(url);
  } catch {
    console.warn(
      '[db] DATABASE_URL cannot be parsed as a URL, connection will not work. ' +
      'It seems the value from the template is still in .env: ' + url.slice(0, 48),
    );
    return 'postgres://dummy:dummy@localhost:5432/dummy';
  }
  return url;
}

/**
 * SSL — только там, где он есть. Neon и другие облака требуют SSL,
 * база на платформе relaxdev работает без него, и 'require' там ломает подключение.
 * Явный sslmode в строке подключения главнее.
 */
function sslFor(url: string): 'require' | false {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get('sslmode');
    if (mode === 'disable') return false;
    if (mode && mode !== 'prefer' && mode !== 'allow') return 'require';
    return /(^|\.)(neon\.tech|supabase\.co|supabase\.com|amazonaws\.com)$/.test(u.hostname) ? 'require' : false;
  } catch {
    return false;
  }
}

const DB_URL = getSafeUrl();

// relaxdev: приложение — один долгоживущий процесс, поэтому настройки по умолчанию:
// пул до 10 соединений (параллельные запросы в Promise.all идут одновременно, а не
// друг за другом), соединения не закрываются по простою, подготовленные запросы включены.
// Ограничения max: 1 / prepare: false были нужны только для Vercel и пулера Neon.
const sql = postgres(DB_URL, {
  ssl: sslFor(DB_URL),
  onnotice: () => {},
});

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