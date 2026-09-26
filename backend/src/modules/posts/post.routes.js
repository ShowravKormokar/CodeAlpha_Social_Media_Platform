import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../middlewares/validation.middleware.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { postService } from './post.service.js';
import { successResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  imageUrl: z.string().url().optional().nullable(),
});

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const postIdSchema = z.object({
  id: z.string().uuid(),
});

router.post('/', authMiddleware, validateBody(createPostSchema), async (req, res, next) => {
  try {
    const post = await postService.create(req.user.id, req.validatedBody);
    res.status(201).json(successResponse(post, 'Post created successfully'));
  } catch (err) {
    next(err);
  }
});

router.get('/', optionalAuthMiddleware, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const pagination = getPaginationParams(req.query);
    const result = await postService.list(pagination, currentUserId);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/feed', authMiddleware, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await postService.getFeed(req.user.id, pagination);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', optionalAuthMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const post = await postService.getPost(req.validatedParams.id, currentUserId);
    res.json(successResponse(post));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authMiddleware, validateParams(postIdSchema), validateBody(updatePostSchema), async (req, res, next) => {
  try {
    const post = await postService.update(req.validatedParams.id, req.user.id, req.validatedBody);
    res.json(successResponse(post, 'Post updated successfully'));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await postService.delete(req.validatedParams.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/like', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await postService.like(req.validatedParams.id, req.user.id);
    res.json(successResponse(null, 'Post liked'));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/like', authMiddleware, validateParams(postIdSchema), async (req, res, next) => {
  try {
    await postService.unlike(req.validatedParams.id, req.user.id);
    res.json(successResponse(null, 'Post unliked'));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/likes', optionalAuthMiddleware, validateParams(postIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await postService.getLikes(req.validatedParams.id, pagination);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/comments', optionalAuthMiddleware, validateParams(postIdSchema), validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await postService.getComments(req.validatedParams.id, pagination);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

export default router;