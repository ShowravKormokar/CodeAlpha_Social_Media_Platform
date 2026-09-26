import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { bookmarkService } from './bookmark.service.js';
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

router.post('/posts/:id/bookmark', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await bookmarkService.create(req.user.id, req.validatedParams.id);
    res.json(successResponse(null, 'Post bookmarked'));
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:id/bookmark', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await bookmarkService.delete(req.user.id, req.validatedParams.id);
    res.json(successResponse(null, 'Bookmark removed'));
  } catch (err) {
    next(err);
  }
});

router.get('/', authMiddleware, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await bookmarkService.list(req.user.id, pagination);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:id/bookmark', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    const isBookmarked = await bookmarkService.isBookmarked(req.user.id, req.validatedParams.id);
    res.json(successResponse({ isBookmarked }));
  } catch (err) {
    next(err);
  }
});

export default router;