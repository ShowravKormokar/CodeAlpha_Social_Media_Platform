/**
 * Media upload configuration and client-side helpers.
 *
 * IMPORTANT: everything in this file is UX ONLY. It exists to fail
 * fast and give a clear message, never to enforce security. The
 * backend (Phase 01, `src/modules/media`) re-validates the real file
 * content and remains the authoritative boundary.
 *
 * The limits below mirror `backend/src/modules/media/media.constants.js`.
 * If they ever drift, the backend wins and returns a 4xx that the
 * modal surfaces verbatim.
 */

import { mediaApi } from '../api/media.api.js';
import { getInitials } from './format.js';

export const MEDIA_TYPES = {
  PROFILE_AVATAR: 'profile_avatar',
  PROFILE_BANNER: 'profile_banner',
  POST_IMAGE: 'post_image'
};

/** Matches the Phase 01 input whitelist. */
export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/** Value for the hidden file input's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp';

const KB = 1024;
const MB = 1024 * 1024;

/**
 * Per-purpose configuration. This is the single place the upload UI
 * learns what a given media type expects; the modal itself is generic.
 */
export const MEDIA_TYPE_CONFIG = {
  [MEDIA_TYPES.PROFILE_AVATAR]: {
    label: 'Profile picture',
    title: 'Update profile picture',
    description: 'Your profile picture is shown next to your posts and comments.',
    hint: 'Square works best. Your image is cropped to a circle in the app.',
    maxFileSize: 2 * MB,
    maxWidth: 1024,
    maxHeight: 1024,
    aspectRatio: '1:1',
    previewShape: 'circle',
    icon: 'ri-user-face-line',
    accept: ACCEPT_ATTRIBUTE
  },
  [MEDIA_TYPES.PROFILE_BANNER]: {
    label: 'Profile banner',
    title: 'Update profile banner',
    description: 'A wide banner shown at the top of your profile.',
    hint: 'Recommended ratio is 16:9. Very tall images are cropped.',
    maxFileSize: 5 * MB,
    maxWidth: 1920,
    maxHeight: 1080,
    aspectRatio: '16:9',
    previewShape: 'wide',
    icon: 'ri-image-2-line',
    accept: ACCEPT_ATTRIBUTE
  },
  [MEDIA_TYPES.POST_IMAGE]: {
    label: 'Post image',
    title: 'Add image to your post',
    description: 'Attach a single image to your post.',
    hint: 'JPG, PNG or WebP. Landscape and portrait are both fine.',
    maxFileSize: 8 * MB,
    maxWidth: 1920,
    maxHeight: 1920,
    aspectRatio: 'free',
    previewShape: 'contain',
    icon: 'ri-image-line',
    accept: ACCEPT_ATTRIBUTE
  }
};

export function getMediaConfig(mediaType) {
  return MEDIA_TYPE_CONFIG[mediaType] || null;
}

export function isSupportedMediaType(mediaType) {
  return Object.prototype.hasOwnProperty.call(MEDIA_TYPE_CONFIG, mediaType);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';

  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;

  const megabytes = bytes / MB;
  return `${megabytes >= 10 ? Math.round(megabytes) : Math.round(megabytes * 10) / 10} MB`;
}

export function getFileExtension(filename = '') {
  const base = String(filename).split(/[\\/]/).pop() || '';
  const dot = base.lastIndexOf('.');
  if (dot === -1 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Checks a file before it is sent anywhere.
 *
 * Returns `{ valid: true }` or `{ valid: false, message }` where the
 * message is safe to show the user directly. Deliberately conservative
 * about false negatives rather than false positives: a file this check
 * dislikes is usually one the backend would reject anyway.
 */
export function validateImageFile(file, mediaType) {
  const config = getMediaConfig(mediaType);

  if (!file) {
    return { valid: false, message: 'No file selected. Please choose an image.' };
  }

  if (file.size === 0) {
    return { valid: false, message: 'That file is empty. Please choose another image.' };
  }

  const limit = config?.maxFileSize;

  if (limit && file.size > limit) {
    return {
      valid: false,
      message: `That image is ${formatBytes(file.size)}. The limit for this image type is ${formatBytes(limit)}.`
    };
  }

  const mime = (file.type || '').toLowerCase();
  const extension = getFileExtension(file.name);

  // The declared MIME type and the extension are both forgeable, so
  // neither is trusted as a security check — the backend inspects the
  // decoded bytes. Here they only decide whether the file is worth
  // sending: a non-empty MIME must be on the whitelist, and when the
  // browser reports none (some drag sources do) the extension decides.
  if (mime) {
    if (!ACCEPTED_MIME_TYPES.includes(mime)) {
      return {
        valid: false,
        message: 'Unsupported file type. Please choose a JPG, PNG or WebP image.'
      };
    }
  } else if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      message: 'Unsupported file type. Please choose a JPG, PNG or WebP image.'
    };
  }

  return { valid: true };
}

/**
 * Pulls the first image out of a drop or paste event. Returns null
 * when the drop carries no usable file, so callers can show a clear
 * "that isn't an image" message instead of silently doing nothing.
 */
export function extractImageFile(dataTransfer) {
  if (!dataTransfer) return null;

  const files = dataTransfer.files;

  if (files && files.length > 0) {
    return files[0];
  }

  // Some browsers only populate `items` during a drag operation.
  const items = dataTransfer.items;

  if (items) {
    for (let index = 0; index < items.length; index += 1) {
      if (items[index].kind === 'file') {
        const file = items[index].getAsFile();
        if (file) return file;
      }
    }
  }

  return null;
}

/**
 * Reads intrinsic dimensions in the browser so the preview can show
 * them. Resolves to null on failure — an unreadable preview must not
 * block the upload, since the backend does its own decode check.
 */
export function readImageDimensions(objectUrl) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.src = '';
    };

    image.onerror = () => {
      resolve(null);
      image.src = '';
    };

    image.src = objectUrl;
  });
}

/**
 * Resolves the image a profile, post or author should display.
 *
 * An uploaded image is stored as a media id and served by
 * `GET /api/v1/media/:id/content`; an external URL is used as-is.
 * The media id always wins, so a URL left over from before an upload
 * can never be shown alongside it.
 *
 * Kept here, apart from the upload UI, so every surface that renders a
 * profile picture or post image resolves it the same way.
 */
export function resolveMediaSource(mediaId, fallbackUrl = '') {
  if (mediaId) {
    return mediaApi.getContentUrl(mediaId);
  }
  return fallbackUrl || '';
}

export function getAvatarMarkup({ name, mediaId, fallbackUrl } = {}) {
  const source = resolveMediaSource(mediaId, fallbackUrl);
  if (!source) return escapeHTML(getInitials(name || 'User'));

  return `<img src="${escapeHTML(source)}" alt="">`;
}

export function getUserAvatarMarkup(user = {}) {
  user = user || {};
  const profile = user.profile || user.data?.profile || {};

  return getAvatarMarkup({
    name: profile.displayName || profile.display_name || user.displayName || user.display_name || user.name || user.username,
    mediaId: profile.avatarMediaId || profile.avatar_media_id || user.avatarMediaId || user.avatar_media_id,
    fallbackUrl: profile.avatarUrl || profile.avatar_url || user.avatarUrl || user.avatar_url
  });
}

function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Maps a backend error code onto a message a user can act on.
 * Unknown codes fall back to the server message, which the Phase 01
 * error handler already keeps free of paths and stack traces.
 */
export function describeMediaError(error, mediaType) {
  const config = getMediaConfig(mediaType);

  switch (error?.code) {
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'That file type is not supported. Please choose a JPG, PNG or WebP image.';

    case 'INVALID_IMAGE':
      return 'That file could not be read as an image. It may be damaged or incomplete.';

    case 'FILE_TOO_LARGE': {
      const serverLimit = Number(error?.details?.maxFileSize);
      const limit = Number.isFinite(serverLimit) && serverLimit > 0
        ? formatBytes(serverLimit)
        : config
          ? formatBytes(config.maxFileSize)
          : null;

      return limit
        ? `That image is too large. The limit is ${limit}.`
        : 'That image is too large. Please choose a smaller file.';
    }

    case 'IMAGE_TOO_LARGE':
      return 'That image has too many pixels. Please choose a smaller image.';

    case 'MEDIA_PROCESSING_FAILED':
      return 'We could not process that image. Please try a different one.';

    case 'STORAGE_FAILED':
    case 'STORAGE_CONFLICT':
      return 'We could not save that image. Please try again.';

    case 'FILE_REQUIRED':
      return 'Please choose an image to upload.';

    case 'VALIDATION_ERROR':
      return 'That upload was not accepted. Please try again.';

    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
      return 'Your session expired. Please sign in again to upload.';

    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many uploads in a short time. Please wait a moment and try again.';

    case 'NETWORK_ERROR':
      return 'Network problem. Check your connection and try again.';

    case 'TIMEOUT':
      return 'The upload took too long and was cancelled. Please try again.';

    case 'CANCELLED':
      return 'Upload cancelled.';

    default:
      break;
  }

  if (error?.status === 0) {
    return 'Network problem. Check your connection and try again.';
  }

  return error?.message || 'Something went wrong while uploading. Please try again.';
}
