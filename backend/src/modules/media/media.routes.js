import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, optionalAuthMiddleware } from '../../middlewares/auth.middleware.js';
import { validateQuery, validateParams } from '../../middlewares/validation.middleware.js';
import { mediaController } from './media.controller.js';
import { singleImageUpload, handleUploadErrors } from './media.upload.js';
import { MEDIA_TYPE_VALUES } from './media.constants.js';
import { registerStorageProvider } from './media.storage.js';
import { LocalStorageProvider } from './local-storage.provider.js';

// The module's composition point: only local storage exists in Phase 01,
// and business logic resolves it through the registry rather than by name.
registerStorageProvider(new LocalStorageProvider());

const router = Router();

const listMediaSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  mediaType: z.enum(MEDIA_TYPE_VALUES).optional(),
});

const mediaIdSchema = z.object({
  id: z.string().uuid(),
});

// Auth runs before Multer so an unauthenticated request never causes a
// body to be buffered or written anywhere.
router.post(
  '/',
  authMiddleware,
  (req, res, next) => singleImageUpload(req, res, (err) => handleUploadErrors(err, req, res, next)),
  mediaController.upload
);

router.get('/', authMiddleware, validateQuery(listMediaSchema), mediaController.list);

router.get('/:id/content', optionalAuthMiddleware, validateParams(mediaIdSchema), mediaController.content);

router.get('/:id', authMiddleware, validateParams(mediaIdSchema), mediaController.getById);

// Declared before `/:id` so "orphans" is never parsed as a media id.
router.delete('/orphans', authMiddleware, mediaController.removeOrphans);

router.delete('/:id', authMiddleware, validateParams(mediaIdSchema), mediaController.remove);

export default router;
