import { pool } from '../../config/database.js';
import { NotFoundError } from '../../errors/AppError.js';

export class ProfileRepository {
  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT user_id, display_name, bio, avatar_url, cover_url, website_url, location, updated_at
       FROM profiles WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, display_name, bio, avatar_url, cover_url, website_url, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, display_name, bio, avatar_url, cover_url, website_url, location, updated_at`,
      [data.userId, data.displayName, data.bio || null, data.avatarUrl || null, data.coverUrl || null, data.websiteUrl || null, data.location || null]
    );
    return result.rows[0];
  }

  async update(userId, data) {
    const fields = [];
    const values = [userId];
    let paramIndex = 2;

    if (data.displayName) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(data.displayName);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(data.bio);
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }
    if (data.coverUrl !== undefined) {
      fields.push(`cover_url = $${paramIndex++}`);
      values.push(data.coverUrl);
    }
    if (data.websiteUrl !== undefined) {
      fields.push(`website_url = $${paramIndex++}`);
      values.push(data.websiteUrl);
    }
    if (data.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(data.location);
    }

    if (fields.length === 0) return this.findByUserId(userId);

    fields.push(`updated_at = NOW()`);

    const result = await pool.query(
      `UPDATE profiles SET ${fields.join(', ')} WHERE user_id = $1
       RETURNING user_id, display_name, bio, avatar_url, cover_url, website_url, location, updated_at`,
      values
    );
    return result.rows[0] || null;
  }

  async getWithUser(userId) {
    const result = await pool.query(
      `SELECT p.user_id, p.display_name, p.bio, p.avatar_url, p.cover_url, p.website_url, p.location, p.updated_at,
              u.id, u.email, u.username, u.status, u.created_at
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1 AND u.deleted_at IS NULL`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

export const profileRepository = new ProfileRepository();