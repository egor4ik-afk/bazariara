import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

/**
 * POST /api/admin/trigger-category
 * Query params:
 *   url          — URL категории gorgia.ge
 *   category     — название категории (ru)
 *   sub_category — название подкатегории (ru)
 *
 * Или только:
 *   category     — запустить все подкатегории этой категории
 */
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const sp           = req.nextUrl.searchParams;
  const categoryUrl  = sp.get('url') || '';
  const category     = sp.get('category') || '';
  const subCategory  = sp.get('sub_category') || '';

  const webhookUrl    = process.env.SCRAPER_WEBHOOK_URL;
  const webhookSecret = process.env.SCRAPER_WEBHOOK_SECRET || '';

  if (!webhookUrl) {
    return NextResponse.json({
      ok: false,
      message: 'SCRAPER_WEBHOOK_URL не задан в переменных окружения',
    }, { status: 501 });
  }

  const payload = {
    action:       'scrape_category',
    url:          categoryUrl,
    category:     category,
    sub_category: subCategory,
    timestamp:    Date.now(),
  };

  try {
    const res = await fetch(`${webhookUrl}/scrape-category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': webhookSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const label = subCategory
        ? `${category} / ${subCategory}`
        : category || categoryUrl;
      return NextResponse.json({
        ok: true,
        message: `Парсинг запущен: ${label}`,
      });
    }

    const text = await res.text();
    return NextResponse.json({ error: `Webhook error: ${res.status} ${text}` }, { status: 502 });

  } catch (e) {
    return NextResponse.json({ error: `Сервер недоступен: ${e}` }, { status: 503 });
  }
}
