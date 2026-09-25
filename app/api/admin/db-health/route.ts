import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';
import { inspectIds, repairId, whereAmI } from '@/lib/db-repair';

/**
 * Диагностика базы ИЗ САМОГО САЙТА. Скрипт в терминале работает с базой
 * из локального .env, а сайт — с DATABASE_URL на Vercel. Если они разные,
 * скрипт чинит не ту базу. Здесь используется ровно то же подключение,
 * что у всего сайта.
 */

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  try {
    return NextResponse.json({ where: await whereAmI(sql), tables: await inspectIds(sql) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();
  try {
    const broken = (await inspectIds(sql)).filter((t) => !t.ok);
    const fixed: string[] = [];
    for (const t of broken) {
      await repairId(sql, t.table);
      fixed.push(t.table);
    }
    return NextResponse.json({ fixed, tables: await inspectIds(sql) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
