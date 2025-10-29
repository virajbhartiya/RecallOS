import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash
      },
      select: { id: true, email: true, created_at: true }
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email || undefined
    });

    // Set session cookie
    setAuthCookie(res, token);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      externalId: user.external_id || undefined
    });

    // Set session cookie
    setAuthCookie(res, token);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

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

export default router;

