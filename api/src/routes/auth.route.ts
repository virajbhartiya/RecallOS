import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie'
import { generateToken } from '../utils/jwt'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth'
import { hashPassword, comparePassword } from '../utils/password'
import { logger } from '../utils/logger'

const router = Router()

// Get current user
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      externalId: req.user!.externalId,
    },
  })
})

// Logout (clear session cookie)
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res)
  res.status(200).json({ message: 'Logged out successfully' })
})

// Register with email/password
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' })
    }

    const existing = await prisma.user.findFirst({ where: { email } as any })
    if (existing) {
      return res.status(409).json({ message: 'User already exists' })
    }

    const password_hash = await hashPassword(password)
    const user = await prisma.user.create({ data: { email, password_hash } as any })

    const token = generateToken({
      userId: (user as any).id,
      email: (user as any).email || undefined,
      externalId: (user as any).external_id || undefined,
    })
    setAuthCookie(res, token)
    return res.status(201).json({
      message: 'Registered',
      token,
      user: { id: (user as any).id, email: (user as any).email },
    })
  } catch (error) {
    logger.error('Register error:', error)
    return res.status(500).json({ message: 'Failed to register' })
  }
})

// Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' })
    }

    const user = await prisma.user.findFirst({ where: { email } as any })
    if (!user || !(user as any).password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const ok = await comparePassword(password, (user as any).password_hash as any)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = generateToken({
      userId: (user as any).id,
      email: (user as any).email || undefined,
      externalId: (user as any).external_id || undefined,
    })
    setAuthCookie(res, token)
    return res.status(200).json({
      message: 'Logged in',
      token,
      user: { id: (user as any).id, email: (user as any).email },
    })
  } catch (error) {
    logger.error('Login error:', error)
    return res.status(500).json({ message: 'Failed to login' })
  }
})

// Demo endpoint to set the session cookie with a provided token/string
router.post('/session', (req: Request, res: Response) => {
  const { token } = req.body || {}
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'token is required' })
  }
  setAuthCookie(res, token)
  return res.status(200).json({ message: 'session set' })
})

// Clear the session cookie
router.delete('/session', (_req: Request, res: Response) => {
  clearAuthCookie(res)
  return res.status(200).json({ message: 'session cleared' })
})

// Get token for extension (creates user if doesn't exist)
router.post('/extension-token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' })
    }

    // Find or create user by external_id
    let user = await prisma.user.findFirst({
      where: { external_id: userId },
    })

    if (!user) {
      user = await prisma.user.create({
        data: { external_id: userId },
      })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      externalId: user.external_id || undefined,
    })

    res.status(200).json({
      message: 'Token generated successfully',
      token,
      user: {
        id: user.id,
        externalId: user.external_id,
      },
    })
  } catch (error) {
    logger.error('Extension token error:', error)
    res.status(500).json({ message: 'Failed to generate token' })
  }
})

export default router
