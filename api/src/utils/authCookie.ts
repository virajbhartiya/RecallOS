import { Response } from 'express';
import { getCookieDomain, getSessionCookieName, isCookieSecure } from './env';

export function setAuthCookie(res: Response, value: string, maxAgeMs: number = 1000 * 60 * 60 * 24 * 30): void {
  const name = getSessionCookieName();
  res.cookie(name, value, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'none',
    domain: getCookieDomain(),
    path: '/',
    maxAge: maxAgeMs,
  } as any);
}

export function clearAuthCookie(res: Response): void {
  const name = getSessionCookieName();
  res.clearCookie(name, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: 'none',
    domain: getCookieDomain(),
    path: '/',
  } as any);
}

