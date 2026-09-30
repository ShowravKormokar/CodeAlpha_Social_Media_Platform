import path from 'path';
import fs from 'fs/promises';
import { env } from '../../config/env.js';
import { STORAGE_PROVIDER } from './media.constants.js';
import { StorageProvider } from './media.storage.js';
import { assertSafeStorageKey } from './media.validation.js';
import { AppError, InternalError } from '../../errors/AppError.js';
import { logger } from '../../config/logger.js';

/**
 * Local filesystem provider. Files are written under MEDIA_UPLOAD_DIR,
 * which lives outside src/ and is never mounted as static application
 * content. Replacing it with an S3/R2 provider requires no changes to
 * the media service or repository.
 */
export class LocalStorageProvider extends StorageProvider {
  constructor(rootDir = env.media.uploadDir) {
    super();
    this.name = STORAGE_PROVIDER.LOCAL;
    this.rootDir = rootDir;
  }

  async put(storageKey, buffer) {
    const absolutePath = this.resolve(storageKey);

    try {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o750 });
      // 'wx' fails if the object already exists, so a UUID collision
      // can never silently overwrite an existing image.
      await fs.writeFile(absolutePath, buffer, { flag: 'wx', mode: 0o640 });
      return { storageKey, sizeBytes: buffer.length };
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new AppError('Storage key collision, please retry the upload', 409, 'STORAGE_CONFLICT');
      }
      logger.error({ err, storageKey }, 'Failed to store media file');
      throw new AppError('Failed to store the uploaded file', 500, 'STORAGE_FAILED');
    }
  }

  async read(storageKey) {
    const absolutePath = this.resolve(storageKey);
    try {
      return await fs.readFile(absolutePath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new AppError('Stored file not found', 404, 'STORAGE_OBJECT_NOT_FOUND');
      }
      logger.error({ err, storageKey }, 'Failed to read media file');
      throw new AppError('Failed to read the stored file', 500, 'STORAGE_FAILED');
    }
  }

  async delete(storageKey) {
    const absolutePath = this.resolve(storageKey);
    try {
      await fs.unlink(absolutePath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      logger.error({ err, storageKey }, 'Failed to delete media file');
      throw new AppError('Failed to delete the stored file', 500, 'STORAGE_FAILED');
    }
  }

  toPublicUrl(storageKey) {
    assertSafeStorageKey(storageKey);
    const prefix = env.media.publicPath.replace(/\/+$/, '');
    return `${prefix}/${storageKey}`;
  }

  /**
   * Maps a storage key onto an absolute path. Only local storage knows
   * about the filesystem; callers above this layer pass storage keys.
   */
  resolve(storageKey) {
    assertSafeStorageKey(storageKey);
    const absolutePath = path.resolve(this.rootDir, ...storageKey.split('/'));
    if (!this.isInsideRoot(absolutePath)) {
      throw new InternalError('Storage path rejected');
    }
    return absolutePath;
  }

  isInsideRoot(absolutePath) {
    const root = path.resolve(this.rootDir);
    const target = path.resolve(absolutePath);
    return target === root || target.startsWith(root + path.sep);
  }
}
