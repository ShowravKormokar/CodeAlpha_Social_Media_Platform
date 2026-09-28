import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { followService } from './follow.service.js';
import { successResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';

const router = Router();

const userIdSchema = z.object({
  id: z.string().uuid(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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

router.get('/:id/followers', optionalAuthMiddleware, validateParams(userIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const pagination = getPaginationParams(req.query);
    const result = await followService.getFollowers(req.validatedParams.id, pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/following', optionalAuthMiddleware, validateParams(userIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const pagination = getPaginationParams(req.query);
    const result = await followService.getFollowing(req.validatedParams.id, pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

export default router;