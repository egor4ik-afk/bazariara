// FILE: middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['ru', 'en', 'ka'] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'ru';

/**
 * Категории, удалённые из каталога в августе 2026.
 * Их URL отдаём 410 Gone, а не 404: 410 = «удалено навсегда», Google
 * выкидывает такие страницы из индекса за дни, а 404 перепроверяет месяцами.
 * Речь про ~2 400 товарных URL, поэтому разница ощутимая.
 *
 * Здесь и старые (EN) ключи, и новые (RU) — редиректы из next.config.js
 * для них удалены, чтобы не гонять бота по цепочке 301 → 410.
 */
const GONE_CATEGORY_KEYS = new Set([
  // актуальные ключи на момент удаления
  'climate', 'furniture', 'garden', 'heaters', 'lighting',
  'plumbing', 'toys', 'warehouse', 'ikea', 'top',
  // ключи из прошлых версий структуры URL
  'klimaticheskoeoborudovanie', 'mebel', 'sad', 'santehnika',
  'osveschenie', 'newyear', 'deti', 'kids', 'gorgia',
]);

const LIVE_CATEGORY_KEYS = new Set([
  'hiking', 'power', 'animals',
  'med', 'spetsii', 'churchhelaipastila', 'chay', 'otkrytki',
]);

function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

function detectLocale(req: NextRequest): Locale {
  const cookieLang = req.cookies.get('language')?.value;
  if (isLocale(cookieLang)) return cookieLang;

  const accept = req.headers.get('accept-language') || '';
  const preferred = accept.split(',')[0]?.split('-')[0];
  if (isLocale(preferred)) return preferred;

  return DEFAULT_LOCALE;
}

/** Минимальная страница для 410. noindex — чтобы её саму не проиндексировали. */
function gone(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Раздел закрыт — BAZARI ARA</title>
<style>body{background:#111827;color:#e5e7eb;font-family:system-ui,-apple-system,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
a{color:#a3e635}main{padding:24px;max-width:520px}h1{font-size:22px;margin:0 0 12px}
p{color:#9ca3af;line-height:1.6;margin:0 0 20px}
.btn{display:inline-block;padding:12px 24px;background:#84cc16;color:#111827;
border-radius:999px;font-weight:700;text-decoration:none}</style></head>
<body><main>
<h1>Этого раздела больше нет</h1>
<p>Мы изменили ассортимент: теперь это туризм и отдых, повербанки, товары для животных
и гостинцы из Грузии — мёд, чурчхела, чай, специи.</p>
<a class="btn" href="/">Перейти в каталог</a>
</main></body></html>`;

  return new NextResponse(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ── Админка: своя логика авторизации, локализация не нужна ──────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();

    const token = req.cookies.get('admin_token')?.value;
    const secret = process.env.ADMIN_SECRET || '';

    if (!token || token !== secret) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── 410 Gone для удалённых категорий ─────────────────────────────────────
  // Ловим три формата URL, накопившихся за три версии структуры:
  //   /products/{cat}/{id}   — текущий
  //   /{locale}/products/{cat}/{id}
  //   /{cat}/{id}            — самый первый, короткий
  const seg = pathname.split('/').filter(Boolean);
  const path = isLocale(seg[0]) ? seg.slice(1) : seg;

  if (path[0] === 'products' && path[1] && GONE_CATEGORY_KEYS.has(path[1])) return gone();
  if (path.length === 2 && GONE_CATEGORY_KEYS.has(path[0]) && /^\d+$/.test(path[1])) return gone();

  // ?category=furniture на главной раньше отдавал 200 с пустым списком —
  // классический Soft 404, их у нас в GSC уже 138 штук.
  const cat = searchParams.get('category');
  if (cat && GONE_CATEGORY_KEYS.has(cat) && !LIVE_CATEGORY_KEYS.has(cat)) return gone();

  // ── Публичный сайт: locale-роутинг ───────────────────────────────────────
  const first = seg[0];

  if (isLocale(first)) {
    const rest = '/' + seg.slice(1).join('/');
    const url = req.nextUrl.clone();
    url.pathname = rest === '/' ? '/' : rest;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-locale', first);

    const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    res.cookies.set('language', first, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api|.*\\..*).*)'],
};