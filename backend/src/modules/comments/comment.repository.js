import { pool } from '../../config/database.js';
import { NotFoundError } from '../../errors/AppError.js';

export class CommentRepository {
  async findById(id, currentUserId = null) {
    const query = `
      SELECT c.*, u.username, pr.display_name, pr.avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE c.id = $1 AND c.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at, updated_at, deleted_at`,
      [data.postId, data.userId, data.content]
    );
    return result.rows[0];
  }

  async update(id, userId, data) {
    if (!data.content) return this.findById(id);

    const result = await pool.query(
      `UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING id, post_id, user_id, content, created_at, updated_at, deleted_at`,
      [data.content, id, userId]
    );
    return result.rows[0] || null;
  }

  async softDelete(id, userId) {
    const result = await pool.query(
      `UPDATE comments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, userId]
    );
    return result.rows[0] !== undefined;
  }

  async listByPost(postId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const query = `
      SELECT c.*, u.username, pr.display_name, pr.avatar_url
      FROM comments c
      JOIN users u ON u.id = c.user_id
      JOIN profiles pr ON pr.user_id = u.id
      WHERE c.post_id = $1 AND c.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'
      ORDER BY c.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM comments WHERE post_id = $1 AND deleted_at IS NULL
    `;

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
}

export const commentRepository = new CommentRepository();