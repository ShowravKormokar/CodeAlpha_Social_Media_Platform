import { pool } from '../../config/database.js';
import { ConflictError, NotFoundError } from '../../errors/AppError.js';

export class LikeRepository {
  async create(postId, userId) {
    try {
      const result = await pool.query(
        `INSERT INTO post_likes (post_id, user_id)
         VALUES ($1, $2)
         RETURNING post_id, user_id, created_at`,
        [postId, userId]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') { // unique_violation
        throw new ConflictError('Already liked this post', 'ALREADY_LIKED');
      }
      throw err;
    }
  }

  async delete(postId, userId) {
    const result = await pool.query(
      `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2 RETURNING post_id`,
      [postId, userId]
    );
    return result.rows[0] !== undefined;
  }

  async getByPost(postId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT pl.user_id, pl.created_at, u.username, pr.display_name, pr.avatar_url, pr.avatar_media_id
      FROM post_likes pl
      JOIN users u ON u.id = pl.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE pl.post_id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
      ORDER BY pl.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM post_likes WHERE post_id = $1`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [postId, limit, offset]),
      pool.query(countQuery, [postId])
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

  async count(postId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM post_likes WHERE post_id = $1`,
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

export const likeRepository = new LikeRepository();