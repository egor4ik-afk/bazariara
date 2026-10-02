
import { PrismaClient } from '@prisma/client';
import postgres from 'postgres';

// --- Prisma Client (used by most of the app) ---

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: https://pris.ly/d/help/next-js-best-practices
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// --- postgres.js Client (used for specific cases like migrations or raw queries) ---

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

const sql = postgres(getSafeUrl(), {
  ssl: 'require',
  max: 1,
  prepare: false,
  connect_timeout: 15,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
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
