import { pool } from '../../config/database.js';
import { NotFoundError } from '../../errors/AppError.js';

export class UserRepository {
  async findById(id) {
    const result = await pool.query(
      `SELECT id, email, username, password_hash, status, email_verified_at, created_at, updated_at, deleted_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const result = await pool.query(
      `SELECT id, email, username, password_hash, status, email_verified_at, created_at, updated_at, deleted_at
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  async findByUsername(username) {
    const result = await pool.query(
      `SELECT id, email, username, password_hash, status, email_verified_at, created_at, updated_at, deleted_at
       FROM users WHERE username = $1 AND deleted_at IS NULL`,
      [username.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  async findByEmailOrUsername(identifier) {
    const result = await pool.query(
      `SELECT id, email, username, password_hash, status, email_verified_at, created_at, updated_at, deleted_at
       FROM users 
       WHERE (email = $1 OR username = $1) AND deleted_at IS NULL`,
      [identifier.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, password_hash, status, email_verified_at, created_at, updated_at, deleted_at`,
      [data.email.toLowerCase(), data.username.toLowerCase(), data.passwordHash]
    );
    return result.rows[0];
  }

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;

    if (data.email) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email.toLowerCase());
    }
    if (data.username) {
      fields.push(`username = $${paramIndex++}`);
      values.push(data.username.toLowerCase());
    }
    if (data.passwordHash) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(data.passwordHash);
    }
    if (data.status) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.emailVerifiedAt !== undefined) {
      fields.push(`email_verified_at = $${paramIndex++}`);
      values.push(data.emailVerifiedAt);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, username, password_hash, status, email_verified_at, created_at, updated_at, deleted_at`,
      values
    );
    return result.rows[0] || null;
  }

  async softDelete(id) {
    const result = await pool.query(
      `UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );
    return result.rows[0] !== undefined;
  }

  async search(query, limit = 20, offset = 0) {
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT id, email, username, status, created_at
       FROM users 
       WHERE (username ILIKE $1 OR email ILIKE $1) AND deleted_at IS NULL
       ORDER BY username
       LIMIT $2 OFFSET $3`,
      [searchTerm, limit, offset]
    );
    return result.rows;
  }

  async searchCount(query) {
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT COUNT(*) FROM users 
       WHERE (username ILIKE $1 OR email ILIKE $1) AND deleted_at IS NULL`,
      [searchTerm]
    );
    return result.rows[0].count;
  }

  async getStats(userId) {
    const [postsCount, followersCount, followingCount] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND deleted_at IS NULL`, [userId]),
      pool.query(`SELECT COUNT(*) FROM user_follows WHERE following_id = $1`, [userId]),
      pool.query(`SELECT COUNT(*) FROM user_follows WHERE follower_id = $1`, [userId]),
    ]);

    return {
      posts: parseInt(postsCount.rows[0].count),
      followers: parseInt(followersCount.rows[0].count),
      following: parseInt(followingCount.rows[0].count),
    };
  }

  async isFollowing(followerId, followingId) {
    const result = await pool.query(
      `SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  async findByIds(userIds) {
    if (!userIds.length) return [];
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT id, username, created_at FROM users WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      userIds
    );
    return result.rows;
  }

  async getStatsBatch(userIds) {
    if (!userIds.length) return {};
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    
    const [postsResult, followersResult, followingResult] = await Promise.all([
      pool.query(
        `SELECT user_id, COUNT(*) as count FROM posts WHERE user_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY user_id`,
        userIds
      ),
      pool.query(
        `SELECT following_id as user_id, COUNT(*) as count FROM user_follows WHERE following_id IN (${placeholders}) GROUP BY following_id`,
        userIds
      ),
      pool.query(
        `SELECT follower_id as user_id, COUNT(*) as count FROM user_follows WHERE follower_id IN (${placeholders}) GROUP BY follower_id`,
        userIds
      ),
    ]);

    const stats = {};
    for (const userId of userIds) {
      stats[userId] = { posts: 0, followers: 0, following: 0 };
    }
    
    for (const row of postsResult.rows) {
      stats[row.user_id] = { ...stats[row.user_id], posts: parseInt(row.count) };
    }
    for (const row of followersResult.rows) {
      stats[row.user_id] = { ...stats[row.user_id], followers: parseInt(row.count) };
    }
    for (const row of followingResult.rows) {
      stats[row.user_id] = { ...stats[row.user_id], following: parseInt(row.count) };
    }

    return stats;
  }

  async isFollowingBatch(followerId, followingIds) {
    if (!followingIds.length) return {};
    const placeholders = followingIds.map((_, i) => `$${i + 2}`).join(',');
    const result = await pool.query(
      `SELECT following_id FROM user_follows WHERE follower_id = $1 AND following_id IN (${placeholders})`,
      [followerId, ...followingIds]
    );
    const followingSet = new Set(result.rows.map(r => r.following_id));
    const map = {};
    for (const id of followingIds) {
      map[id] = followingSet.has(id);
    }
    return map;
  }

  async isFollowedByBatch(userId, followerIds) {
    if (!followerIds.length) return {};
    const placeholders = followerIds.map((_, i) => `$${i + 2}`).join(',');
    const result = await pool.query(
      `SELECT follower_id FROM user_follows WHERE following_id = $1 AND follower_id IN (${placeholders})`,
      [userId, ...followerIds]
    );
    const followerSet = new Set(result.rows.map(r => r.follower_id));
    const map = {};
    for (const id of followerIds) {
      map[id] = followerSet.has(id);
    }
    return map;
  }

  async countMutualFollowers(userId1, userId2) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM user_follows uf1
       JOIN user_follows uf2 ON uf2.follower_id = uf1.follower_id
       WHERE uf1.following_id = $1 AND uf2.following_id = $2`,
      [userId1, userId2]
    );
    return parseInt(result.rows[0].count);
  }

  async countMutualFollowersBatch(currentUserId, userIds) {
    if (!userIds.length) return {};
    const placeholders = userIds.map((_, i) => `$${i + 2}`).join(',');
    const result = await pool.query(
      `SELECT uf2.following_id, COUNT(*) as mutual_count
       FROM user_follows uf1
       JOIN user_follows uf2 ON uf2.follower_id = uf1.follower_id
       WHERE uf1.following_id = $1 AND uf2.following_id IN (${placeholders})
       GROUP BY uf2.following_id`,
      [currentUserId, ...userIds]
    );
    const mutualMap = {};
    for (const row of result.rows) {
      mutualMap[row.following_id] = parseInt(row.mutual_count);
    }
    // Ensure all userIds have an entry
    for (const id of userIds) {
      if (mutualMap[id] === undefined) {
        mutualMap[id] = 0;
      }
    }
    return mutualMap;
  }
}

export const userRepository = new UserRepository();