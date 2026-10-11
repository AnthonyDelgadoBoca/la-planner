import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hasCookie = request.cookies.has('la_guide_session');
  const pathname = request.nextUrl.pathname;
  const publicPath = pathname === '/login' || pathname.startsWith('/api/login') || pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname === '/manifest.webmanifest' || pathname === '/icon.svg';
  if (!hasCookie && !publicPath) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Please unlock the planner first.' }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  if (hasCookie && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
