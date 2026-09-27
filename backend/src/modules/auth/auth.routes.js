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
  name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
}).optional();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

function setAuthCookies(res, accessToken, refreshToken) {
  const cookieOptions = {
    httpOnly: env.cookie.httpOnly,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge: env.cookie.maxAge,
  };

  // Only set domain in production
  if (env.cookie.domain) {
    cookieOptions.domain = env.cookie.domain;
  }

  res.cookie(env.cookie.name, accessToken, cookieOptions);

  res.cookie(env.cookie.refreshName, refreshToken, {
    ...cookieOptions,
    maxAge: env.cookie.refreshMaxAge,
  });
}

function clearAuthCookies(res) {
  const cookieOptions = {
    httpOnly: env.cookie.httpOnly,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
  };

  if (env.cookie.domain) {
    cookieOptions.domain = env.cookie.domain;
  }

  res.clearCookie(env.cookie.name, cookieOptions);
  res.clearCookie(env.cookie.refreshName, cookieOptions);
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
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      emailVerificationToken: result.emailVerificationToken,
      emailVerificationExpires: result.emailVerificationExpires,
    }, 'Registration successful. Please verify your email.'));
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
      accessTokenExpiresAt: result.accessTokenExpiresAt,
    }, 'Login successful'));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[env.cookie.refreshName];
    await authService.logout(refreshToken);
    clearAuthCookies(res);
    res.json(successResponse(null, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json(successResponse({
      user,
      accessTokenExpiresAt: req.authExpiresAt,
    }));
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const refreshToken = req.validatedBody?.refreshToken || req.cookies?.[env.cookie.refreshName];
    if (!refreshToken) {
      return res.status(401).json(errorResponse('REFRESH_TOKEN_REQUIRED', 'Refresh token required'));
    }

    const tokens = await authService.refresh(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json(successResponse({
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
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

router.post('/verify-email', validateBody(verifyEmailSchema), async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.validatedBody.token);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', authRateLimiter, validateBody(resendVerificationSchema), async (req, res, next) => {
  try {
    const result = await authService.resendEmailVerificationByEmail(req.validatedBody.email);
    res.json(successResponse(result, 'Verification email sent'));
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.validatedBody.email);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.validatedBody.token, req.validatedBody.newPassword);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;