import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '../../middlewares/validation.middleware.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { notificationService } from './notification.service.js';
import { successResponse, paginatedResponse } from '../../common/response/index.js';
import { getPaginationParams } from '../../common/pagination/index.js';

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

const notificationIdSchema = z.object({
  id: z.string().uuid(),
});

router.get('/', authMiddleware, validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const pagination = getPaginationParams(req.query);
    const result = await notificationService.getNotifications(req.user.id, {
      ...pagination,
      unreadOnly: req.validatedQuery.unreadOnly,
    });
    res.json(paginatedResponse(result.data, result.pagination));
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json(successResponse({ count }));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authMiddleware, validateParams(notificationIdSchema), async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.validatedParams.id, req.user.id);
    if (!notification) {
      return res.status(404).json(successResponse(null, 'Notification not found'));
    }
    res.json(successResponse(notification, 'Notification marked as read'));
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', authMiddleware, async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);
    res.json(successResponse({ count }, `${count} notifications marked as read`));
  } catch (err) {
    next(err);
  }
});

export default router;