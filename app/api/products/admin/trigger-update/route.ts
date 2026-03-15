import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

/**
 * POST /api/admin/trigger-update
 *
 * Запускает ежедневный апдейт цен и наличия.
 * Дёргает webhook на сервере со scraper-agent.
 *
 * На сервере scraper-agent должен слушать:
 *   POST http://your-server:8080/webhook/update
 *   с заголовком X-Secret: SCRAPER_WEBHOOK_SECRET
 *
 * Простой webhook-сервер: см. scraper-agent/webhook_server.py
 */
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const webhookUrl = process.env.SCRAPER_WEBHOOK_URL;
  const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET || '';

  // Вариант 1: Webhook на сервер (рекомендуется)
  if (webhookUrl) {
    try {
      const res = await fetch(`${webhookUrl}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': webhookSecret,
        },
        body: JSON.stringify({ action: 'update', timestamp: Date.now() }),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        return NextResponse.json({ ok: true, message: 'Апдейт запущен на сервере' });
      }
      const text = await res.text();
      return NextResponse.json({ error: `Webhook error: ${res.status} ${text}` }, { status: 502 });
    } catch (e) {
      return NextResponse.json({ error: `Не удалось подключиться к серверу: ${e}` }, { status: 503 });
    }
  }

  // Вариант 2: GitHub Actions dispatch (если нет webhook)
  const ghToken = process.env.GH_TOKEN;
  const ghRepo = process.env.GH_REPO; // "owner/repo"
  if (ghToken && ghRepo) {
    try {
      const res = await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/update.yml/dispatches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      });
      if (res.ok || res.status === 204) {
        return NextResponse.json({ ok: true, message: 'GitHub Actions workflow запущен' });
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
