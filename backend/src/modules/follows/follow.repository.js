import { pool } from '../../config/database.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';

export class FollowRepository {
  async create(followerId, followingId) {
    if (followerId === followingId) {
      throw new ForbiddenError('Cannot follow yourself', 'CANNOT_FOLLOW_SELF');
    }

    const targetExists = await pool.query(
      `SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`,
      [followingId]
    );
    if (!targetExists.rows[0]) {
      throw new NotFoundError('User');
    }

    try {
      const result = await pool.query(
        `INSERT INTO user_follows (follower_id, following_id)
         VALUES ($1, $2)
         RETURNING follower_id, following_id, created_at`,
        [followerId, followingId]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') { // unique_violation
        throw new ConflictError('Already following this user', 'ALREADY_FOLLOWING');
      }
      if (err.code === '23514') { // check_violation
        throw new ForbiddenError('Cannot follow yourself', 'CANNOT_FOLLOW_SELF');
      }
      throw err;
    }
  }

  async delete(followerId, followingId) {
    const result = await pool.query(
      `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2 RETURNING follower_id`,
      [followerId, followingId]
    );
    return result.rows[0] !== undefined;
  }

  async getFollowers(userId, { page = 1, limit = 20 }, currentUserId = null) {
    const offset = (page - 1) * limit;
    let query;
    let queryParams;

    if (currentUserId) {
      query = `
        SELECT uf.follower_id, uf.created_at, u.username, pr.display_name, pr.avatar_url, pr.avatar_media_id,
               EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $4 AND following_id = uf.follower_id) as is_following
        FROM user_follows uf
        JOIN users u ON u.id = uf.follower_id
        JOIN profiles pr ON pr.user_id = u.id
        WHERE uf.following_id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userId, limit, offset, currentUserId];
    } else {
      query = `
        SELECT uf.follower_id, uf.created_at, u.username, pr.display_name, pr.avatar_url, pr.avatar_media_id,
               FALSE as is_following
        FROM user_follows uf
        JOIN users u ON u.id = uf.follower_id
        JOIN profiles pr ON pr.user_id = u.id
        WHERE uf.following_id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userId, limit, offset];
    }

    const countQuery = `SELECT COUNT(*) FROM user_follows WHERE following_id = $1`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
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

  async getFollowing(userId, { page = 1, limit = 20 }, currentUserId = null) {
    const offset = (page - 1) * limit;
    let query;
    let queryParams;

    if (currentUserId) {
      query = `
        SELECT uf.following_id, uf.created_at, u.username, pr.display_name, pr.avatar_url, pr.avatar_media_id,
               EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $4 AND following_id = uf.following_id) as is_following
        FROM user_follows uf
        JOIN users u ON u.id = uf.following_id
        JOIN profiles pr ON pr.user_id = u.id
        WHERE uf.follower_id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userId, limit, offset, currentUserId];
    } else {
      query = `
        SELECT uf.following_id, uf.created_at, u.username, pr.display_name, pr.avatar_url, pr.avatar_media_id,
               FALSE as is_following
        FROM user_follows uf
        JOIN users u ON u.id = uf.following_id
        JOIN profiles pr ON pr.user_id = u.id
        WHERE uf.follower_id = $1 AND u.deleted_at IS NULL AND u.status = 'active'
        ORDER BY uf.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [userId, limit, offset];
    }

    const countQuery = `SELECT COUNT(*) FROM user_follows WHERE follower_id = $1`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
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

  async isFollowing(followerId, followingId) {
    const result = await pool.query(
      `SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  async countFollowers(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM user_follows WHERE following_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async countFollowing(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM user_follows WHERE follower_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
}

export const followRepository = new FollowRepository();