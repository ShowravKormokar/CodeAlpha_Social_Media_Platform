import { pool } from '../../config/database.js';
import { ConflictError, NotFoundError } from '../../errors/AppError.js';

export class ReportRepository {
  async create(data) {
    try {
      const result = await pool.query(
        `INSERT INTO reports (reporter_id, target_type, post_id, comment_id, reported_user_id, reason, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, reporter_id, target_type, post_id, comment_id, reported_user_id, reason, description, status, reviewed_by, reviewed_at, created_at`,
        [data.reporterId, data.targetType, data.postId || null, data.commentId || null, data.reportedUserId || null, data.reason, data.description || null]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictError('Report already exists for this target', 'REPORT_EXISTS');
      }
      throw err;
    }
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM reports WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async list({ page = 1, limit = 20, status = null }) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    const params = [limit, offset];
    const countParams = [];
    let paramIndex = 3;

    if (status) {
      whereClause = 'WHERE status = $1';
      params = [status, limit, offset];
      countParams = [status];
    }

    const query = `
      SELECT r.*, u.username as reporter_username, pr.display_name as reporter_display_name
      FROM reports r
      JOIN users u ON u.id = r.reporter_id
      JOIN profiles pr ON pr.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex - 2} OFFSET $${paramIndex - 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM reports ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
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

  async updateStatus(id, status, reviewedBy) {
    const result = await pool.query(
      `UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3
       RETURNING id, reporter_id, target_type, post_id, comment_id, reported_user_id, reason, description, status, reviewed_by, reviewed_at, created_at`,
      [status, reviewedBy, id]
    );
    return result.rows[0] || null;
  }

  async getByReporter(reporterId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT * FROM reports WHERE reporter_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM reports WHERE reporter_id = $1`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [reporterId, limit, offset]),
      pool.query(countQuery, [reporterId])
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

export const reportRepository = new ReportRepository();