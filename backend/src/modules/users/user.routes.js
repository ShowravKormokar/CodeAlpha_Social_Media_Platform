import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../middlewares/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { userService } from './user.service.js';
import { followService } from '../follows/follow.service.js';
import { profileRepository } from './profile.repository.js';
import { successResponse, errorResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';
import { NotFoundError, ConflictError } from '../../errors/AppError.js';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  location: z.string().max(150).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const userIdSchema = z.object({
  id: z.string().uuid(),
});

router.get('/search', optionalAuthMiddleware, validateQuery(z.object({ q: z.string().min(2) })), async (req, res, next) => {
  try {
    const { q } = req.validatedQuery;
    const pagination = getPaginationParams(req.query);
    const currentUserId = req.user?.id;
    const result = await userService.searchUsers(q, pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuthMiddleware, validateParams(userIdSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const profile = await userService.getPublicProfile(req.validatedParams.id, currentUserId);
    res.json(successResponse(profile));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/posts', optionalAuthMiddleware, validateParams(userIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const pagination = getPaginationParams(req.query);
    const result = await userService.getUserPosts(req.validatedParams.id, pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/followers', optionalAuthMiddleware, validateParams(userIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const pagination = getPaginationParams(req.query);
    const result = await userService.getFollowers(req.validatedParams.id, pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/following', optionalAuthMiddleware, validateParams(userIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const pagination = getPaginationParams(req.query);
    const result = await userService.getFollowing(req.validatedParams.id, pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/follow', authMiddleware, validateParams(userIdSchema), async (req, res, next) => {
  try {
    await followService.follow(req.user.id, req.validatedParams.id);
    res.json(successResponse(null, 'Successfully followed user'));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/follow', authMiddleware, validateParams(userIdSchema), async (req, res, next) => {
  try {
    await followService.unfollow(req.user.id, req.validatedParams.id);
    res.json(successResponse(null, 'Successfully unfollowed user'));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/relationship', optionalAuthMiddleware, validateParams(userIdSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const relationship = await userService.getRelationship(req.validatedParams.id, currentUserId);
    res.json(successResponse(relationship));
  } catch (err) {
    next(err);
  }
});

router.get('/suggestions', authMiddleware, validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(50).default(10) })), async (req, res, next) => {
  try {
    const limit = req.validatedQuery.limit;
    const result = await userService.getSuggestions(req.user.id, { limit });
    res.json(successResponse(result.data));
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authMiddleware, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await userService.updateProfile(req.user.id, req.validatedBody);
    res.json(successResponse(profile, 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
});

router.patch('/me/password', authMiddleware, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    const { authService } = await import('../auth/auth.service.js');
    await authService.changePassword(req.user.id, req.validatedBody.currentPassword, req.validatedBody.newPassword);
    res.json(successResponse(null, 'Password changed successfully. Please log in again.'));
  } catch (err) {
    next(err);
  }
});

export default router;