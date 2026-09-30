import { pool } from '../../config/database.js';

export class BookmarkRepository {
  async create(userId, postId) {
    try {
      const result = await pool.query(
        `INSERT INTO post_bookmarks (user_id, post_id)
         VALUES ($1, $2)
         RETURNING user_id, post_id, created_at`,
        [userId, postId]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        return null; // already bookmarked
      }
      throw err;
    }
  }

  async delete(userId, postId) {
    const result = await pool.query(
      `DELETE FROM post_bookmarks WHERE user_id = $1 AND post_id = $2 RETURNING user_id`,
      [userId, postId]
    );
    return result.rows[0] !== undefined;
  }

  async listByUser(userId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT pb.post_id, pb.created_at, p.content, p.image_url, p.user_id,
             u.username, pr.display_name, pr.avatar_url, pr.avatar_media_id
      FROM post_bookmarks pb
      JOIN posts p ON p.id = pb.post_id
      JOIN users u ON u.id = p.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE pb.user_id = $1 AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'
      ORDER BY pb.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM post_bookmarks WHERE user_id = $1`;

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

  async isBookmarked(userId, postId) {
    const result = await pool.query(
      `SELECT 1 FROM post_bookmarks WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );
    return result.rows.length > 0;
  }
}

export const bookmarkRepository = new BookmarkRepository();