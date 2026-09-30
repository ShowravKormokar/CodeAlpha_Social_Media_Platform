import { mediaService } from './media.service.js';
import { extractUploadedFile } from './media.upload.js';
import { successResponse } from '../../common/response/index.js';
import { getStorageProvider } from './media.storage.js';

export class MediaController {
  /**
   * POST /media
   *
   * Multipart upload of a single image. Ownership is taken from the
   * authenticated principal, never from the request body.
   */
  async upload(req, res, next) {
    try {
      const file = extractUploadedFile(req);
      const media = await mediaService.upload(req.user.id, file, req.body || {});
      res.status(201).json(successResponse(media, 'Media uploaded successfully'));
    } catch (err) {
      next(err);
    }
  }

  /** GET /media - the authenticated user's own uploads. */
  async list(req, res, next) {
    try {
      const { page, limit, mediaType } = req.validatedQuery;
      const result = await mediaService.listForOwner(req.user.id, { page, limit, mediaType });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Request successful',
      });
    } catch (err) {
      next(err);
    }
  }

  /** GET /media/:id - readable only by the owner. */
  async getById(req, res, next) {
    try {
      const media = await mediaService.getOwned(req.validatedParams.id, req.user.id);
      res.json(successResponse(media));
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /media/:id - removes the row and the stored object. */
  async remove(req, res, next) {
    try {
      await mediaService.deleteOwned(req.validatedParams.id, req.user.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /media/orphans
   *
   * Reclaims the caller's own uploads that no profile or post points at
   * any more, for example an image uploaded before the user abandoned
   * the upload modal. Scoped to the authenticated user.
   */
  async removeOrphans(req, res, next) {
    try {
      const limit = Number.parseInt(req.query.limit, 10);
      const result = await mediaService.cleanupOrphans(req.user.id, {
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50,
      });
      res.json(successResponse(result, 'Orphaned media removed'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /media/:id/content
   *
   * Streams the stored bytes through the storage provider. Uploaded
   * content is never mounted as static application content, so it is
   * served with an explicit, non-executable content type plus
   * defensive headers rather than being interpreted as a script or a
   * same-origin HTML document.
   */
  async content(req, res, next) {
    try {
      const media = await mediaService.getReadable(req.validatedParams.id);
      const provider = getStorageProvider(media.storageProvider);
      const buffer = await mediaService.readStoredFile(provider, media.storageKey);

      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${media.id}.${media.storageKey.split('.').pop()}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const mediaController = new MediaController();
