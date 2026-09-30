import sharp from 'sharp';
import { env } from '../../config/env.js';
import {
  ALLOWED_INPUT_FORMATS,
  MAX_INPUT_PIXELS,
  MEDIA_ERROR_CODES,
  getMediaLimits,
} from './media.constants.js';
import { AppError } from '../../errors/AppError.js';

/**
 * Decodes an uploaded buffer with Sharp, validates the real format,
 * resizes within the purpose's bounds and re-encodes to a controlled
 * output format.
 *
 * Nothing is ever stored as a byte-for-byte copy of the upload: the
 * buffer is fully decoded and re-encoded, which drops metadata, EXIF,
 * embedded profiles and any trailing payload appended to the file.
 */
export async function processImage(buffer, mediaType) {
  const limits = getMediaLimits(mediaType);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError('Uploaded file is empty', 422, MEDIA_ERROR_CODES.INVALID_IMAGE);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'error',
    }).metadata();
  } catch {
    // Corrupt data, a truncated file, or a format Sharp will not decode.
    throw new AppError(
      'The uploaded file is not a valid or readable image',
      422,
      MEDIA_ERROR_CODES.INVALID_IMAGE
    );
  }

  // Authoritative format check: this reflects the decoded content, not
  // the filename, extension or client-declared MIME type.
  if (!ALLOWED_INPUT_FORMATS.includes(metadata.format)) {
    throw new AppError(
      'Unsupported file type. Allowed types: JPEG, PNG, WebP',
      415,
      MEDIA_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
      { allowed: ALLOWED_INPUT_FORMATS }
    );
  }

  if (!metadata.width || !metadata.height) {
    throw new AppError(
      'The uploaded file is not a valid or readable image',
      422,
      MEDIA_ERROR_CODES.INVALID_IMAGE
    );
  }

  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new AppError('Image dimensions exceed the allowed limit', 413, MEDIA_ERROR_CODES.IMAGE_TOO_LARGE, {
      maxPixels: MAX_INPUT_PIXELS,
    });
  }

  const pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    // Apply EXIF orientation then drop it. No withMetadata() call is
    // made anywhere, so Sharp writes no metadata: no EXIF/GPS, no ICC
    // profile, no embedded thumbnail.
    .rotate()
    .resize({
      width: limits.maxWidth,
      height: limits.maxHeight,
      fit: 'inside',        // preserve aspect ratio, never upscale
      withoutEnlargement: true,
    });

  const encoded =
    limits.outputFormat === 'jpeg'
      ? pipeline.jpeg({ quality: env.media.jpegQuality, mozjpeg: true })
      : pipeline.webp({ quality: env.media.webpQuality });

  let output;
  try {
    output = await encoded.toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError(
      'Failed to process the uploaded image',
      422,
      MEDIA_ERROR_CODES.MEDIA_PROCESSING_FAILED
    );
  }

  if (!output?.data?.length || !output.info?.width || !output.info?.height) {
    throw new AppError(
      'Failed to process the uploaded image',
      422,
      MEDIA_ERROR_CODES.MEDIA_PROCESSING_FAILED
    );
  }

  return {
    buffer: output.data,
    mimeType: `image/${limits.outputFormat}`,
    width: output.info.width,
    height: output.info.height,
    sizeBytes: output.data.length,
    sourceFormat: metadata.format,
    outputFormat: limits.outputFormat,
  };
}

/**
 * Confirms the bytes actually on disk decode back to the expected
 * format. Used to verify a stored object before it is referenced.
 */
export async function verifyStoredImage(buffer, expectedFormat) {
  try {
    const { format } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (format !== expectedFormat) return false;
    return true;
  } catch {
    return false;
  }
}
