import path from 'path';
import { z } from 'zod';
import {
  MEDIA_TYPE_VALUES,
  MEDIA_ERROR_CODES,
  getMediaLimits,
} from './media.constants.js';
import { ValidationError, AppError } from '../../errors/AppError.js';

/**
 * Body schema for POST /media. Ownership is intentionally absent:
 * the owner is always `req.user.id` from the JWT middleware, never a
 * client-supplied field.
 */
export const uploadMediaSchema = z.object({
  mediaType: z.enum(MEDIA_TYPE_VALUES, {
    errorMap: () => ({ message: 'mediaType must be one of profile_avatar, profile_banner, post_image' }),
  }),
  ownerId: z.never().optional(),
  userId: z.never().optional(),
  storageKey: z.never().optional(),
});

export function validateUploadBody(body = {}) {
  const result = uploadMediaSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
  }
  return result.data;
}

/**
 * Guards against a caller trying to inject a storage path through a
 * request field. Storage keys are only ever generated server-side.
 */
export function assertNoClientStoragePath(body = {}) {
  const forbidden = ['storageKey', 'storage_key', 'path', 'filename', 'storageProvider'];
  for (const field of forbidden) {
    if (body[field] !== undefined) {
      throw new ValidationError('Client cannot control storage location', { field });
    }
  }
}

/**
 * The stored key is derived entirely from a UUID and the purpose, so a
 * traversal attempt can only come from outside this function. This is
 * a cheap structural assertion used before any filesystem call.
 */
export function assertSafeStorageKey(storageKey) {
  if (typeof storageKey !== 'string' || storageKey.length === 0) {
    throw new ValidationError('Invalid storage key');
  }
  if (storageKey.includes('\0')) {
    throw new ValidationError('Invalid storage key');
  }
  const normalized = path.posix.normalize(storageKey);
  if (
    normalized !== storageKey ||
    normalized.startsWith('..') ||
    normalized.startsWith('/') ||
    path.isAbsolute(storageKey)
  ) {
    throw new ValidationError('Invalid storage key');
  }
  return storageKey;
}

/**
 * Applies the per-purpose size ceiling. Multer only knows the global
 * maximum, so this is the second, purpose-aware gate.
 */
export function assertFileSizeWithinPurposeLimit(fileSize, mediaType) {
  const { maxFileSize } = getMediaLimits(mediaType);
  if (fileSize > maxFileSize) {
    throw new AppError(
      `File is larger than the ${formatBytes(maxFileSize)} limit for this media type`,
      413,
      MEDIA_ERROR_CODES.FILE_TOO_LARGE,
      { maxFileSize }
    );
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
