import crypto from 'crypto';
import { env } from '../../config/env.js';
import { MEDIA_TYPES, OUTPUT_FORMATS } from './media.constants.js';
import { ValidationError, InternalError } from '../../errors/AppError.js';

/**
 * StorageProvider contract.
 *
 * Implementations must expose:
 *   name         - short identifier persisted in the `media` table
 *   put()        - write a buffer under a generated storage key
 *   read()       - return a stored object as a Buffer
 *   delete()     - remove an object by storage key
 *   toPublicUrl()- map a storage key to a client-safe URL
 *
 * Nothing above this layer may reference a filesystem path. Media
 * business logic only ever passes and persists the `storage_key`,
 * which keeps a future S3/R2 swap from touching the service,
 * repository or API response shapes.
 */
export class StorageProvider {
  constructor() {
    if (new.target === StorageProvider) {
      throw new TypeError('StorageProvider is an interface and cannot be instantiated directly');
    }
  }

  /* eslint-disable no-unused-vars */
  async put(storageKey, buffer) {
    throw new Error('put() must be implemented');
  }

  async delete(storageKey) {
    throw new Error('delete() must be implemented');
  }

  async read(storageKey) {
    throw new Error('read() must be implemented');
  }

  toPublicUrl(storageKey) {
    throw new Error('toPublicUrl() must be implemented');
  }
  /* eslint-enable no-unused-vars */
}

/**
 * Builds a UUID-based storage key.
 *
 * The filename is entirely server-generated and contains no part of the
 * client's original name, so neither path traversal nor an
 * extension-spoofed upload can reach the filesystem.
 *
 * Shape: <media_type>/<year>/<month>/<uuid>.<ext>
 * The year/month segment keeps directory sizes bounded; the UUID
 * guarantees uniqueness even under concurrent uploads.
 */
export function buildStorageKey(mediaType, extension) {
  if (!Object.values(OUTPUT_FORMATS).includes(extension)) {
    throw new ValidationError('Unsupported output format', { extension });
  }
  if (!Object.values(MEDIA_TYPES).includes(mediaType)) {
    throw new ValidationError('Unsupported media type', { mediaType });
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `${mediaType}/${year}/${month}/${crypto.randomUUID()}.${extension}`;
}

/**
 * Provider registry. Adding S3/R2 later means registering another
 * implementation and setting MEDIA_STORAGE_PROVIDER, with no change to
 * the media service, repository or API contract.
 */
const providers = new Map();

export function registerStorageProvider(provider) {
  if (!(provider instanceof StorageProvider)) {
    throw new TypeError('Storage providers must extend StorageProvider');
  }
  providers.set(provider.name, provider);
  return provider;
}

export function getStorageProvider(name = env.media.storageProvider) {
  const provider = providers.get(name);
  if (!provider) {
    throw new InternalError('Configured storage provider is not available');
  }
  return provider;
}

/** Test seam: drops registered providers so suites stay isolated. */
export function clearStorageProviders() {
  providers.clear();
}
