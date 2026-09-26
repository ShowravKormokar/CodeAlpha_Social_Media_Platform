import { pool } from '../../config/database.js';
import { NotFoundError } from '../../errors/AppError.js';

export class PostRepository {
  async findById(id, currentUserId = null) {
    const query = `
      SELECT p.*, u.username, pr.display_name, pr.avatar_url,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) as comments_count,
             ${currentUserId ? `(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = '${currentUserId}')` : 'FALSE'} as user_liked
      FROM posts p
      JOIN users u ON u.id = p.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE p.id = $1 AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, content, image_url, created_at, updated_at, deleted_at`,
      [data.userId, data.content, data.imageUrl || null]
    );
    return result.rows[0];
  }

  async update(id, userId, data) {
    const fields = [];
    const values = [id, userId];
    let paramIndex = 3;

    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.imageUrl !== undefined) {
      fields.push(`image_url = $${paramIndex++}`);
      values.push(data.imageUrl);
    }

    if (fields.length === 0) return this.findById(id, userId);

    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id, user_id, content, image_url, created_at, updated_at, deleted_at`,
      values
    );
    return result.rows[0] || null;
  }

  async softDelete(id, userId) {
    const result = await pool.query(
      `UPDATE posts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId]
    );
    return result.rows[0] !== undefined;
  }

  async list({ page = 1, limit = 20, userId = null }, currentUserId = null) {
    const offset = (page - 1) * limit;
    let whereClause = 'p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = \'active\'';
    const params = [limit, offset];
    let paramIndex = 3;

    if (userId) {
      whereClause += ` AND p.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    const query = `
      SELECT p.*, u.username, pr.display_name, pr.avatar_url,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) as comments_count,
             ${currentUserId ? `(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = '${currentUserId}')` : 'FALSE'} as user_liked
      FROM posts p
      JOIN users u ON u.id = p.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(2))
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getFeed(userId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT p.*, u.username, pr.display_name, pr.avatar_url,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
             (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) as comments_count,
             (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_liked
      FROM posts p
      JOIN users u ON u.id = p.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'
        AND (p.user_id = $1 OR p.user_id IN (
          SELECT following_id FROM user_follows WHERE follower_id = $1
        ))
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM posts p
      WHERE p.deleted_at IS NULL
        AND (p.user_id = $1 OR p.user_id IN (
          SELECT following_id FROM user_follows WHERE follower_id = $1
        ))
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [userId, limit, offset]),
      pool.query(countQuery, [userId])
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getLikeCount(postId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM post_likes WHERE post_id = $1`,
      [postId]
    );
    return parseInt(result.rows[0].count);
  }

  async getCommentCount(postId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM comments WHERE post_id = $1 AND deleted_at IS NULL`,
      [postId]
    );
    return parseInt(result.rows[0].count);
  }

  async userHasLiked(postId, userId) {
    const result = await pool.query(
      `SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );
    return result.rows.length > 0;
  }
}

export const postRepository = new PostRepository();