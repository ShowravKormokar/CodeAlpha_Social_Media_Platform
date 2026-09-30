import { mediaRepository } from './media.repository.js';
import { getStorageProvider, buildStorageKey } from './media.storage.js';
import { processImage } from './media.processor.js';
import { MEDIA_ERROR_CODES } from './media.constants.js';
import {
  validateUploadBody,
  assertNoClientStoragePath,
  assertFileSizeWithinPurposeLimit,
} from './media.validation.js';
import { AppError, NotFoundError } from '../../errors/AppError.js';
import { logger } from '../../config/logger.js';

export class MediaService {
  /**
   * Processes and stores a single uploaded image.
   *
   * `ownerId` always comes from the authenticated JWT principal. Any
   * owner field supplied by the client is rejected rather than used.
   */
  async upload(ownerId, file, rawBody = {}) {
    assertNoClientStoragePath(rawBody);
    const { mediaType } = validateUploadBody(rawBody);

    if (!file || !file.buffer?.length) {
      throw new AppError('An image file is required', 422, MEDIA_ERROR_CODES.FILE_REQUIRED);
    }

    assertFileSizeWithinPurposeLimit(file.size, mediaType);

    const provider = getStorageProvider();

    // Decode -> validate real format -> resize -> strip metadata ->
    // re-encode. The upload buffer is never written to disk as-is.
    const processed = await processImage(file.buffer, mediaType);

    const storageKey = buildStorageKey(mediaType, processed.outputFormat);
    const stored = await provider.put(storageKey, processed.buffer);

    try {
      const record = await mediaRepository.create({
        ownerId,
        mediaType,
        storageProvider: provider.name,
        storageKey: stored.storageKey,
        // Recorded for auditing only; never used to build a path.
        originalFilename: truncateFilename(file.originalname),
        originalMimeType: file.mimetype || null,
        mimeType: processed.mimeType,
        sizeBytes: stored.sizeBytes,
        width: processed.width,
        height: processed.height,
      });

      return this.formatMedia(record, provider);
    } catch (err) {
      // Do not leave an orphaned file behind when persistence fails.
      await this.safeDelete(provider, stored.storageKey);
      throw err;
    }
  }

  async listForOwner(ownerId, params) {
    const result = await mediaRepository.listByOwner(ownerId, params);
    const provider = getStorageProvider();
    return {
      data: result.data.map((row) => this.formatMedia(row, provider)),
      pagination: result.pagination,
    };
  }

  async getOwned(id, ownerId) {
    const record = await mediaRepository.findByIdAndOwner(id, ownerId);
    if (!record) {
      throw new NotFoundError('Media');
    }
    return this.formatMedia(record, getStorageProvider());
  }

  /**
   * Resolves media for reading. Media is not private in this MVP,
   * matching how `profiles.avatar_url` and `posts.image_url` are
   * already consumed by the frontend, so reads are not owner-gated.
   */
  async getReadable(id) {
    const record = await mediaRepository.findById(id);
    if (!record) {
      throw new NotFoundError('Media');
    }
    const provider = getStorageProvider(record.storage_provider);
    return this.formatMedia(record, provider);
  }

  /**
   * Reads a stored object back through the provider, so the service
   * layer never touches a filesystem path directly.
   */
  async readStoredFile(provider, storageKey) {
    return provider.read(storageKey);
  }

  async deleteOwned(id, ownerId) {
    // A referenced record must not disappear: the foreign keys are
    // ON DELETE SET NULL, so a plain delete would silently strip the
    // avatar, banner or post image. Clearing is an explicit act done
    // through the profile or post endpoint instead.
    const references = await mediaRepository.findReferences(id);
    if (references.total > 0) {
      throw new AppError(
        'Media is in use and must be removed from its profile or post first',
        409,
        MEDIA_ERROR_CODES.MEDIA_IN_USE,
        { profileRefs: references.profileRefs, postRefs: references.postRefs }
      );
    }

    const record = await mediaRepository.delete(id, ownerId);
    if (!record) {
      throw new NotFoundError('Media');
    }
    await this.safeDelete(getStorageProvider(), record.storage_key, record.storage_provider);
    return true;
  }

  /**
   * Phase 03 link guard. Before a profile or post may reference a media
   * record, the record must exist, belong to the JWT principal, and
   * match the purpose the caller is writing to. A record uploaded for a
   * post can therefore never be silently attached as an avatar.
   */
  async assertOwnedForPurpose(mediaId, ownerId, mediaType) {
    const record = await mediaRepository.findByIdAndOwner(mediaId, ownerId);
    if (!record) {
      throw new NotFoundError('Media');
    }
    if (record.media_type !== mediaType) {
      throw new AppError(
        'Media cannot be used for this field',
        422,
        MEDIA_ERROR_CODES.MEDIA_PURPOSE_MISMATCH,
        { expected: mediaType, actual: record.media_type }
      );
    }
    return record;
  }

  async findReferences(id) {
    return mediaRepository.findReferences(id);
  }

  /**
   * Removes a replaced media record and its stored file, but only once
   * nothing points at it any more. The caller must have committed the
   * new reference first; this is the second half of the swap and never
   * runs before the write that replaces it.
   */
  async cleanupIfUnreferenced(mediaId, ownerId) {
    if (!mediaId) return false;
    const deleted = await mediaRepository.deleteIfUnreferenced(mediaId, ownerId);
    if (!deleted) return false;
    await this.safeDelete(getStorageProvider(), deleted.storage_key, deleted.storage_provider);
    return true;
  }

  /**
   * Sweeps leftovers: uploads that were never linked to a profile or
   * post, plus media dropped by a failed write. Bounded and ordered
   * oldest-first so the oldest orphans are reclaimed first.
   */
  async cleanupOrphans(ownerId, { limit = 50 } = {}) {
    const rows = await mediaRepository.listUnreferenced(ownerId, { limit });
    let removed = 0;
    for (const row of rows) {
      const deleted = await mediaRepository.deleteIfUnreferenced(row.id, ownerId);
      if (!deleted) continue;
      await this.safeDelete(getStorageProvider(), deleted.storage_key, deleted.storage_provider);
      removed += 1;
    }
    return { removed };
  }

  /**
   * Client-safe representation. Only the storage key and its public
   * URL are exposed; no filesystem path or provider internals leak.
   */
  formatMedia(record, provider) {
    return {
      id: record.id,
      ownerId: record.owner_id,
      mediaType: record.media_type,
      storageProvider: record.storage_provider,
      storageKey: record.storage_key,
      url: provider.toPublicUrl(record.storage_key),
      mimeType: record.mime_type,
      sizeBytes: record.size_bytes,
      width: record.width,
      height: record.height,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  async safeDelete(provider, storageKey, providerName = provider.name) {
    try {
      const target = providerName === provider.name ? provider : getStorageProvider(providerName);
      await target.delete(storageKey);
    } catch (err) {
      logger.error({ err, storageKey }, 'Failed to clean up media file');
    }
  }
}

function truncateFilename(filename) {
  if (typeof filename !== 'string') return null;
  const base = filename.split(/[\\/]/).pop();
  return base ? base.slice(0, 255) : null;
}

export const mediaService = new MediaService();
