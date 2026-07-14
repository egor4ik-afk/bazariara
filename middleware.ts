import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['ru', 'en', 'ka'] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'ru';

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];

  if (isLocale(first)) {
    // Локаль уже в адресе: снимаем префикс внутренне (rewrite),
    // видимый URL не меняется, существующие роуты работают как есть.
    const rest = '/' + segments.slice(1).join('/');
    const url = req.nextUrl.clone();
    url.pathname = rest === '/' ? '/' : rest;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-locale', first);

    const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    res.cookies.set('language', first, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Локали в адресе нет — определяем и редиректим на /{locale}{pathname}.
  // 308 (Permanent Redirect, сохраняет метод) — сигнализирует поисковикам,
  // что бывший bare-URL теперь постоянно живёт под /{locale}/...
  const locale = detectLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Не трогаем: _next статику, API, админку, файлы со статическим расширением
  // (favicon.ico, site.webmanifest, robots.txt, sitemap.xml, картинки и т.п.)
  matcher: ['/((?!_next/static|_next/image|api|admin|.*\\..*).*)'],
};