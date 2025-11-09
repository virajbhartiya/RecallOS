import { Request, Response, NextFunction } from 'express'
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.util'
import { getSessionCookieName } from '../utils/env.util'
import { logger } from '../utils/logger.util'
import { getUserWithCache } from '../utils/user-cache.util'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email?: string
    externalId?: string
  }
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      const cookieName = getSessionCookieName()
      token = (req.cookies && req.cookies[cookieName]) || null
    }

    if (!token) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const payload = verifyToken(token)
    if (!payload) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    const user = await getUserWithCache(payload.userId)

    if (!user) {
      logger.error('Auth middleware: User not found for userId:', payload.userId)
      res.status(401).json({ message: 'User not found' })
      return
    }

    req.user = {
      id: user.id,
      email: user.email || undefined,
      externalId: user.external_id || undefined,
    }

    next()
  } catch (error) {
    logger.error('Auth middleware error:', error)
    res.status(500).json({ message: 'Authentication error' })
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = extractTokenFromHeader(req.headers.authorization)

  if (!token) {
    const cookieName = getSessionCookieName()
    token = (req.cookies && req.cookies[cookieName]) || null
  }

  if (!token) {
    next()
    return
  }

  const payload = verifyToken(token)
  if (payload) {
    req.user = {
      id: payload.userId,
      email: payload.email,
      externalId: payload.externalId,
    }
  }

  next()
}
