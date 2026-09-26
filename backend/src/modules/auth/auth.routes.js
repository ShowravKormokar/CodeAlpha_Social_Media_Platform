import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middlewares/validation.middleware.js';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

router.post('/register', authRateLimiter, validateBody(registerSchema), (req, res) => {
  res.status(201).json({ success: true, message: 'Registration endpoint - to be implemented' });
});

router.post('/login', authRateLimiter, validateBody(loginSchema), (req, res) => {
  res.json({ success: true, message: 'Login endpoint - to be implemented' });
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logout endpoint - to be implemented' });
});

router.get('/me', (req, res) => {
  res.json({ success: true, message: 'Current user endpoint - to be implemented' });
});

router.post('/refresh', (req, res) => {
  res.json({ success: true, message: 'Refresh token endpoint - to be implemented' });
});

export default router;