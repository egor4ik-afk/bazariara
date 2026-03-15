import { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

/** Проверяет токен из cookie или заголовка Authorization */
export function isAuthenticated(req: NextRequest): boolean {
  // Cookie (для страниц)
  const cookieToken = req.cookies.get('admin_token')?.value;
  if (cookieToken && cookieToken === ADMIN_SECRET) return true;

  // Bearer token (для API из fetch)
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === ADMIN_SECRET) return true;

  return false;
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
