import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie';
import { generateToken } from '../utils/jwt';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get current user
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      externalId: req.user!.externalId
    }
  });
});

// Logout (clear session cookie)
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({ message: 'Logged out successfully' });
});

// Demo endpoint to set the session cookie with a provided token/string
router.post('/session', (req: Request, res: Response) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'token is required' });
  }
  setAuthCookie(res, token);
  return res.status(200).json({ message: 'session set' });
});

// Clear the session cookie
router.delete('/session', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'session cleared' });
});

// Get token for extension (creates user if doesn't exist)
router.post('/extension-token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Find or create user by external_id
    let user = await prisma.user.findFirst({
      where: { external_id: userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { external_id: userId }
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      externalId: user.external_id || undefined
    });

    res.status(200).json({
      message: 'Token generated successfully',
      token,
      user: {
        id: user.id,
        externalId: user.external_id
      }
    });
  } catch (error) {
    console.error('Extension token error:', error);
    res.status(500).json({ message: 'Failed to generate token' });
  }
});

export default router;

