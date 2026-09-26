import { Router } from 'express';
import { body } from 'zod';
import { validateBody } from '../../middlewares/validation.middleware.js';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(body.object({
  name: body.string().min(1).max(100),
  username: body.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: body.string().email(),
  password: body.string().min(8).max(100),
})), (req, res) => {
  res.status(201).json({ success: true, message: 'Registration endpoint - to be implemented' });
});

router.post('/login', authRateLimiter, validateBody(body.object({
  emailOrUsername: body.string().min(1),
  password: body.string().min(1),
})), (req, res) => {
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