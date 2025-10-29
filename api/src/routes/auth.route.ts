import { Router, Request, Response } from 'express';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie';

const router = Router();

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

