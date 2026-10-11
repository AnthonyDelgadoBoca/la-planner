import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'la_guide_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  return createHmac('sha256', secret).update(value).digest('hex');
}
export function makeSessionToken() {
  const value = `ok:${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}`;
  return `${value}.${signature(value)}`;
}
export function verifySessionToken(token?: string) {
  if (!token) return false;
  const splitAt = token.lastIndexOf('.');
  if (splitAt < 0) return false;
  const value = token.slice(0, splitAt);
  const supplied = token.slice(splitAt + 1);
  const expected = signature(value);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const match = /^ok:(\d+)$/.exec(value);
  return Boolean(match && Number(match[1]) > Math.floor(Date.now() / 1000));
}
export async function isAuthenticated() {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAME)?.value);
}
export { COOKIE_NAME, MAX_AGE_SECONDS };
