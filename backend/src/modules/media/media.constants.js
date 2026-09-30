import { env } from '../../config/env.js';
import { ValidationError } from '../../errors/AppError.js';

/**
 * Media purposes supported in Phase 01. These values are the single
 * source of truth and map 1:1 to the `media_type` PostgreSQL enum
 * created in migration 016_create_media.sql.
 */
export const MEDIA_TYPES = {
  PROFILE_AVATAR: 'profile_avatar',
  PROFILE_BANNER: 'profile_banner',
  POST_IMAGE: 'post_image',
};

export const MEDIA_TYPE_VALUES = Object.freeze(Object.values(MEDIA_TYPES));

/**
 * Formats the server is willing to decode. Anything else is rejected,
 * including SVG, GIF and PDF, which can carry active or scripting
 * content.
 */
export const ALLOWED_INPUT_FORMATS = Object.freeze(['jpeg', 'png', 'webp']);

/**
 * Formats the server is willing to write. Re-encoding to a controlled
 * set removes any payload the decoder does not fully understand.
 */
export const OUTPUT_FORMATS = Object.freeze(['webp', 'jpeg']);

/**
 * Multer's `fileFilter` runs before Sharp, so this is only a cheap
 * first gate on the declared Content-Type. The authoritative check
 * is `sharp().metadata().format` in the processor.
 */
export const ALLOWED_CLIENT_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/**
 * Per-purpose constraints. Dimensions are maximums and preserve the
 * original aspect ratio; no cropping is applied in Phase 01.
 */
export const MEDIA_TYPE_LIMITS = Object.freeze({
  [MEDIA_TYPES.PROFILE_AVATAR]: {
    maxWidth: 1024,
    maxHeight: 1024,
    maxFileSize: 2 * 1024 * 1024, // 2 MB
    outputFormat: 'webp',
  },
  [MEDIA_TYPES.PROFILE_BANNER]: {
    maxWidth: 1920,
    maxHeight: 1080,
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    outputFormat: 'webp',
  },
  [MEDIA_TYPES.POST_IMAGE]: {
    maxWidth: 1920,
    maxHeight: 1920,
    maxFileSize: env.media.maxFileSize, // 8 MB
    outputFormat: 'webp',
  },
});

/** Sharp decoder limit; guards against decompression bombs. */
export const MAX_INPUT_PIXELS = 50_000_000;

/** Field names accepted on the multipart body. */
export const UPLOAD_FIELD_NAMES = Object.freeze(['file', 'image', 'photo']);

/** Storage provider identifier persisted next to each storage key. */
export const STORAGE_PROVIDER = Object.freeze({
  LOCAL: 'local',
});

export const MEDIA_ERROR_CODES = Object.freeze({
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  INVALID_IMAGE: 'INVALID_IMAGE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',
  STORAGE_FAILED: 'STORAGE_FAILED',
  FILE_REQUIRED: 'FILE_REQUIRED',
  MEDIA_PURPOSE_MISMATCH: 'MEDIA_PURPOSE_MISMATCH',
  MEDIA_IN_USE: 'MEDIA_IN_USE',
});

/**
 * Maps a purpose to its constraints. Throws for unknown purposes so a
 * new purpose can never silently fall through to permissive defaults.
 */
export function getMediaLimits(mediaType) {
  const limits = MEDIA_TYPE_LIMITS[mediaType];
  if (!limits) {
    throw new ValidationError('Unsupported media type', { mediaType });
  }
  return limits;
}

export function isSupportedMediaType(mediaType) {
  return MEDIA_TYPE_VALUES.includes(mediaType);
}
