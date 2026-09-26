import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { reportService } from './report.service.js';
import { successResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';

const router = Router();

const createReportSchema = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId: z.string().uuid(),
  reason: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'reviewed', 'resolved', 'rejected']).optional(),
});

const reportIdSchema = z.object({
  id: z.string().uuid(),
});

const updateStatusSchema = z.object({
  status: z.enum(['reviewed', 'resolved', 'rejected']),
});

router.post('/', authMiddleware, validateBody(createReportSchema), async (req, res, next) => {
  try {
    const report = await reportService.create(req.user.id, req.validatedBody);
    res.status(201).json(successResponse(report, 'Report submitted successfully'));
  } catch (err) {
    next(err);
  }
});

router.get('/', authMiddleware, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await reportService.list({
      ...pagination,
      status: req.validatedQuery.status,
    });
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/my', authMiddleware, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await reportService.getByReporter(req.user.id, pagination);
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authMiddleware, validateParams(reportIdSchema), async (req, res, next) => {
  try {
    const report = await reportService.getReport(req.validatedParams.id);
    if (!report) {
      return res.status(404).json(successResponse(null, 'Report not found'));
    }
    res.json(successResponse(report));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', authMiddleware, validateParams(reportIdSchema), validateBody(updateStatusSchema), async (req, res, next) => {
  try {
    const report = await reportService.updateStatus(req.validatedParams.id, req.validatedBody.status, req.user.id);
    if (!report) {
      return res.status(404).json(successResponse(null, 'Report not found'));
    }
    res.json(successResponse(report, 'Report status updated'));
  } catch (err) {
    next(err);
  }
});

export default router;