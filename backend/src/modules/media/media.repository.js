import { pool } from '../../config/database.js';

/**
 * Data access for the `media` table. The repository only ever receives
 * and returns storage keys; filesystem concerns stay in the storage
 * provider layer.
 */
export class MediaRepository {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO media (
         owner_id, media_type, storage_provider, storage_key,
         original_filename, original_mime_type,
         mime_type, size_bytes, width, height
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, owner_id, media_type, storage_provider, storage_key,
                 original_filename, original_mime_type, mime_type,
                 size_bytes, width, height, created_at, updated_at`,
      [
        data.ownerId,
        data.mediaType,
        data.storageProvider,
        data.storageKey,
        data.originalFilename || null,
        data.originalMimeType || null,
        data.mimeType,
        data.sizeBytes,
        data.width,
        data.height,
      ]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM media WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByIdAndOwner(id, ownerId) {
    const result = await pool.query(
      `SELECT * FROM media WHERE id = $1 AND owner_id = $2`,
      [id, ownerId]
    );
    return result.rows[0] || null;
  }

  async findByStorageKey(storageProvider, storageKey) {
    const result = await pool.query(
      `SELECT * FROM media WHERE storage_provider = $1 AND storage_key = $2`,
      [storageProvider, storageKey]
    );
    return result.rows[0] || null;
  }

  async listByOwner(ownerId, { page = 1, limit = 20, mediaType = null } = {}) {
    const offset = (page - 1) * limit;

    const where = 'owner_id = $1';
    const params = [ownerId];
    if (mediaType) {
      params.push(mediaType);
    }

    const typeClause = mediaType ? ` AND media_type = $${params.length}` : '';
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const query = `
      SELECT * FROM media
      WHERE ${where}${typeClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM media
      WHERE ${where}${typeClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async delete(id, ownerId) {
    const result = await pool.query(
      `DELETE FROM media WHERE id = $1 AND owner_id = $2 RETURNING storage_provider, storage_key`,
      [id, ownerId]
    );
    return result.rows[0] || null;
  }

  /**
   * Reports every feature row currently pointing at this media. Used to
   * decide whether a record may be removed, so cleanup can never drop a
   * file that a profile or post still displays.
   */
  async findReferences(id) {
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM profiles WHERE avatar_media_id = $1 OR banner_media_id = $1)::int AS profile_refs,
         (SELECT COUNT(*) FROM posts WHERE image_media_id = $1)::int AS post_refs`,
      [id]
    );
    const row = result.rows[0] || {};
    return {
      profileRefs: row.profile_refs || 0,
      postRefs: row.post_refs || 0,
      total: (row.profile_refs || 0) + (row.post_refs || 0),
    };
  }

  /**
   * Deletes a media record only when nothing references it, returning
   * the deleted row so the caller can remove the stored file.
   */
  async deleteIfUnreferenced(id, ownerId) {
    const result = await pool.query(
      `DELETE FROM media m
       WHERE m.id = $1
         AND m.owner_id = $2
         AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.avatar_media_id = m.id OR p.banner_media_id = m.id)
         AND NOT EXISTS (SELECT 1 FROM posts po WHERE po.image_media_id = m.id)
       RETURNING m.storage_provider, m.storage_key`,
      [id, ownerId]
    );
    return result.rows[0] || null;
  }

  /**
   * Returns records that are no longer referenced by any profile or
   * post, oldest first. Backs the cleanup of media whose owning write
   * failed, or that a user replaced.
   */
  async listUnreferenced(ownerId, { limit = 50 } = {}) {
    const result = await pool.query(
      `SELECT m.id, m.storage_provider, m.storage_key
       FROM media m
       WHERE m.owner_id = $1
         AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.avatar_media_id = m.id OR p.banner_media_id = m.id)
         AND NOT EXISTS (SELECT 1 FROM posts po WHERE po.image_media_id = m.id)
       ORDER BY m.created_at ASC
       LIMIT $2`,
      [ownerId, limit]
    );
    return result.rows;
  }
}

export const mediaRepository = new MediaRepository();
