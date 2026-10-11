import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, MAX_AGE_SECONDS, makeSessionToken } from '@/lib/auth';
import { timingSafeEqual } from 'node:crypto';

export async function POST(request: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected || !process.env.SESSION_SECRET) return NextResponse.json({ error: 'The site owner has not configured the password yet.' }, { status: 500 });
  let password = '';
  try { password = String((await request.json()).password ?? ''); } catch { return NextResponse.json({ error: 'Please enter the password.' }, { status: 400 }); }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const matches = a.length === b.length && timingSafeEqual(a, b);
  if (!matches) return NextResponse.json({ error: 'Not quite — try again ♡' }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, makeSessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE_SECONDS });
  return response;
}
