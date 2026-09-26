import { pool } from '../../config/database.js';

export class NotificationRepository {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, post_id, comment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, recipient_id, actor_id, type, post_id, comment_id, is_read, created_at, read_at`,
      [data.recipientId, data.actorId || null, data.type, data.postId || null, data.commentId || null]
    );
    return result.rows[0];
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async listByRecipient(recipientId, { page = 1, limit = 20, unreadOnly = false }) {
    const offset = (page - 1) * limit;
    let whereClause = 'recipient_id = $1';
    const params = [recipientId];
    let paramIndex = 2;

    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }

    const query = `
      SELECT n.*, u.username, pr.display_name, pr.avatar_url
      FROM notifications n
      LEFT JOIN users u ON u.id = n.actor_id
      LEFT JOIN profiles pr ON pr.user_id = u.id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    const queryParams = [...params, limit, offset];

    const countQuery = `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, params)
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

  async markAsRead(id, recipientId) {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND recipient_id = $2 AND is_read = FALSE
       RETURNING id, recipient_id, actor_id, type, post_id, comment_id, is_read, created_at, read_at`,
      [id, recipientId]
    );
    return result.rows[0] || null;
  }

  async markAllAsRead(recipientId) {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE recipient_id = $1 AND is_read = FALSE
       RETURNING id`,
      [recipientId]
    );
    return result.rowCount;
  }

  async countUnread(recipientId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = FALSE`,
      [recipientId]
    );
    return parseInt(result.rows[0].count);
  }
}

export const notificationRepository = new NotificationRepository();