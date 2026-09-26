import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middlewares/validation.middleware.js';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authService } from './auth.service.js';
import { env } from '../../config/env.js';
import { successResponse, errorResponse } from '../../common/response/index.js';

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

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(env.cookie.name, accessToken, {
    httpOnly: env.cookie.httpOnly,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: env.cookie.maxAge,
  });

  res.cookie(env.cookie.refreshName, refreshToken, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie(env.cookie.name, {
    httpOnly: env.cookie.httpOnly,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
  });
  res.clearCookie(env.cookie.refreshName, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
  });
}

router.post('/register', authRateLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register({
      name: req.validatedBody.name,
      username: req.validatedBody.username,
      email: req.validatedBody.email,
      password: req.validatedBody.password,
    });

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(201).json(successResponse({
      user: result.user,
      accessToken: result.accessToken,
    }, 'Registration successful'));
  } catch (err) {
    next(err);
  }
});

router.post('/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.validatedBody.emailOrUsername, req.validatedBody.password);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.json(successResponse({
      user: result.user,
      accessToken: result.accessToken,
    }, 'Login successful'));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const refreshToken = req.cookies[env.cookie.refreshName];
    await authService.logout(req.user.id, refreshToken);
    clearAuthCookies(res);
    res.json(successResponse(null, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json(successResponse(user));
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const refreshToken = req.validatedBody.refreshToken || req.cookies[env.cookie.refreshName];
    if (!refreshToken) {
      return res.status(401).json(errorResponse('REFRESH_TOKEN_REQUIRED', 'Refresh token required'));
    }

    const tokens = await authService.refresh(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json(successResponse({
      accessToken: tokens.accessToken,
    }, 'Token refreshed'));
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.validatedBody.currentPassword, req.validatedBody.newPassword);
    clearAuthCookies(res);
    res.json(successResponse(null, 'Password changed successfully. Please log in again.'));
  } catch (err) {
    next(err);
  }
});

export default router;