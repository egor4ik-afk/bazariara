import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Пропускаем страницу логина
  if (pathname === '/admin/login') return NextResponse.next();

  // Проверяем cookie
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

export const config = {
  matcher: ['/admin/:path*'],
};
