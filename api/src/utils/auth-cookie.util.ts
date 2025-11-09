import { Response } from 'express'
import { getCookieDomain, getSessionCookieName, isCookieSecure } from './env.util'
import { logger } from './logger.util'

export function setAuthCookie(
  res: Response,
  value: string,
  maxAgeMs: number = 1000 * 60 * 60 * 24 * 30
): void {
  const name = getSessionCookieName()
  const cookieDomain = getCookieDomain()
  const isLocalhost =
    process.env.NODE_ENV !== 'production' || !cookieDomain || cookieDomain === '.recallos.xyz'

  interface CookieOptions {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax' | 'strict' | 'none'
    path: string
    maxAge: number
    domain?: string
  }

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isLocalhost ? false : isCookieSecure(),
    sameSite: isLocalhost ? 'lax' : 'none',
    path: '/',
    maxAge: maxAgeMs,
  }

  // For localhost, don't set domain (scoped to exact host:port)
  // For production, set domain if provided
  if (!isLocalhost && cookieDomain) {
    cookieOptions.domain = cookieDomain
  }

  // Log cookie settings for debugging
  logger.log('[AuthCookie] Setting cookie:', {
    name,
    domain: cookieOptions.domain || 'localhost (no domain)',
    path: cookieOptions.path,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    isLocalhost,
  })

  res.cookie(name, value, cookieOptions)
}

export function clearAuthCookie(res: Response): void {
  const name = getSessionCookieName()
  const cookieDomain = getCookieDomain()

  // Clear cookie with domain if set
  if (cookieDomain && cookieDomain !== '.recallos.xyz') {
    res.clearCookie(name, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: 'none',
      domain: cookieDomain,
      path: '/',
    })
  }

  // Also clear without domain (for localhost)
  res.clearCookie(name, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  })
}
