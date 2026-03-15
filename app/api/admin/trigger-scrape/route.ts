import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const webhookUrl = process.env.SCRAPER_WEBHOOK_URL;
  const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET || '';

  if (webhookUrl) {
    try {
      const res = await fetch(`${webhookUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': webhookSecret,
        },
        body: JSON.stringify({ action: 'scrape', timestamp: Date.now() }),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        return NextResponse.json({ ok: true, message: 'Полный парсинг запущен. Может занять несколько часов.' });
      }
      const text = await res.text();
      return NextResponse.json({ error: `Webhook error: ${res.status} ${text}` }, { status: 502 });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 503 });
    }
  }

  const ghToken = process.env.GH_TOKEN;
  const ghRepo = process.env.GH_REPO;
  if (ghToken && ghRepo) {
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/scrape.yml/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      });
      if (res.ok || res.status === 204) {
        return NextResponse.json({ ok: true, message: 'GitHub Actions scrape запущен' });
      }
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 503 });
    }
  }

  return NextResponse.json({
    ok: false,
    message: 'Webhook не настроен. Добавь SCRAPER_WEBHOOK_URL в .env',
  }, { status: 501 });
}
