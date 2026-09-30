import multer from 'multer';
import { env } from '../../config/env.js';
import { ALLOWED_CLIENT_MIME_TYPES, MEDIA_ERROR_CODES } from './media.constants.js';
import { AppError } from '../../errors/AppError.js';

/**
 * Centralised Multer configuration.
 *
 * Uploads are buffered in memory: nothing an attacker controls ever
 * touches the filesystem, and the processed image is written straight
 * to its final storage key. The original filename is discarded at this
 * layer and Multer never receives a client-supplied destination path.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.media.maxFileSize,
    files: env.media.maxFiles,
    fields: 10,
    parts: env.media.maxFiles + 10,
    headerPairs: 200,
  },
  fileFilter(req, file, cb) {
    // Cheap pre-filter only. The authoritative check is the decoded
    // format reported by Sharp in the processor, because a client can
    // freely set Content-Type.
    if (!ALLOWED_CLIENT_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      return cb(
        new AppError(
          'Unsupported file type. Allowed types: JPEG, PNG, WebP',
          415,
          MEDIA_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
          { allowed: ['image/jpeg', 'image/png', 'image/webp'] }
        )
      );
    }
    return cb(null, true);
  },
});

/** Accepts a single image under any of the conventional field names. */
export const singleImageUpload = upload.fields(
  ['file', 'image', 'photo'].map((name) => ({ name, maxCount: 1 }))
);

/**
 * Normalises Multer's `req.files` object into a single file, or null.
 * Throws so a missing image is a clear 422 rather than a crash in the
 * service layer.
 */
export function extractUploadedFile(req) {
  const { files } = req;
  if (!files) return null;

  if (Array.isArray(files)) return files[0] || null;

  const firstGroup = Object.values(files)[0];
  return Array.isArray(firstGroup) ? firstGroup[0] || null : firstGroup || null;
}

/** Translates Multer's own errors into the app's error classes. */
export function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new AppError(
          `File is larger than the ${Math.round(env.media.maxFileSize / (1024 * 1024))} MB limit`,
          413,
          MEDIA_ERROR_CODES.FILE_TOO_LARGE,
          { maxFileSize: env.media.maxFileSize }
        )
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new AppError('Too many files or unexpected file field', 400, 'INVALID_UPLOAD')
      );
    }
    return next(new AppError('Invalid upload request', 400, 'INVALID_UPLOAD'));
  }
  return next(err);
}
