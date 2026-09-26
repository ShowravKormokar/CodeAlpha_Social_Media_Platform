import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { commentService } from './comment.service.js';
import { successResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';

const router = Router();

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const postIdSchema = z.object({
  id: z.string().uuid(),
});

const commentIdSchema = z.object({
  id: z.string().uuid(),
});

router.post('/posts/:id/comments', authMiddleware, validateParams(postIdSchema), validateBody(createCommentSchema), async (req, res, next) => {
  try {
    const comment = await commentService.create(req.validatedParams.id, req.user.id, req.validatedBody);
    res.status(201).json(successResponse(comment, 'Comment created successfully'));
  } catch (err) {
    next(err);
  }
});

router.patch('/comments/:id', authMiddleware, validateParams(commentIdSchema), validateBody(updateCommentSchema), async (req, res, next) => {
  try {
    const comment = await commentService.update(req.validatedParams.id, req.user.id, req.validatedBody);
    res.json(successResponse(comment, 'Comment updated successfully'));
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:id', authMiddleware, validateParams(commentIdSchema), async (req, res, next) => {
  try {
    await commentService.delete(req.validatedParams.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;