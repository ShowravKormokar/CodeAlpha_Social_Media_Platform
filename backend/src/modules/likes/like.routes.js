import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { likeService } from './like.service.js';
import { successResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';

const router = Router();

const postIdSchema = z.object({
  id: z.string().uuid(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.post('/posts/:id/like', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await likeService.like(req.validatedParams.id, req.user.id);
    res.json(successResponse(null, 'Post liked'));
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:id/like', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await likeService.unlike(req.validatedParams.id, req.user.id);
    res.json(successResponse(null, 'Post unliked'));
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:id/likes', optionalAuthMiddleware, validateParams(postIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await likeService.getLikes(req.validatedParams.id, pagination);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

export default router;