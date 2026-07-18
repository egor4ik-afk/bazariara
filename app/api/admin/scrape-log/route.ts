// FILE: app/api/admin/scrape-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// Секрет для скрепера (server-to-server, не пользовательская сессия) —
// задайте BAZARIARA_LOG_SECRET в .env на bazariara И BAZARIARA_LOG_SECRET
// в окружении gorgia-scraper (оба должны совпадать).
const SECRET = process.env.BAZARIARA_LOG_SECRET || '';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS scrape_logs (
      id              BIGSERIAL PRIMARY KEY,
      label           TEXT,
      elapsed_seconds INT,
      total           INT,
      new_count       INT,
      updated_count   INT,
      photos          INT,
      ok              BOOLEAN DEFAULT true,
      error           TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// POST — скрепер шлёт сюда итог парсинга (второй канал, помимо Telegram)
export async function POST(req: NextRequest) {
  if (!SECRET || req.headers.get('x-scraper-secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    await ensureTable();

    await sql`
      INSERT INTO scrape_logs (label, elapsed_seconds, total, new_count, updated_count, photos, ok, error)
      VALUES (
        ${body.label || null},
        ${body.elapsed_seconds ?? null},
        ${body.total ?? null},
        ${body.new ?? null},
        ${body.updated ?? null},
        ${body.photos ?? null},
        ${body.ok ?? true},
        ${body.error || null}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/scrape-log:', err);
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}

// GET — последние записи, чтобы смотреть в браузере/curl без Telegram
export async function GET(req: NextRequest) {
  if (!SECRET || req.headers.get('x-scraper-secret') !== SECRET) {
    // для GET разрешаем и без секрета, но только если это внутренний вызов админки —
    // упростим: тот же секрет что и для POST (можно поменять на isAuthenticated при желании)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTable();
    const rows = await sql`
      SELECT * FROM scrape_logs ORDER BY created_at DESC LIMIT 50
    `;
    return NextResponse.json({ logs: rows });
  } catch (err) {
    console.error('GET /api/admin/scrape-log:', err);
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}