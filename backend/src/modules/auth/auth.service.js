import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../../config/database.js';
import { env } from '../../config/env.js';
import { userRepository } from '../users/user.repository.js';
import { profileRepository } from '../users/profile.repository.js';
import { AuthError, ConflictError, ValidationError } from '../../errors/AppError.js';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(data) {
    const existingEmail = await userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('Email already registered', 'EMAIL_EXISTS');
    }

    const existingUsername = await userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError('Username already taken', 'USERNAME_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await client.query(
        `INSERT INTO users (email, username, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, username, status, email_verified_at, created_at, updated_at`,
        [data.email.toLowerCase(), data.username.toLowerCase(), passwordHash]
      );

      await client.query('COMMIT');

      const tokens = this.generateTokens(user.rows[0].id);
      await this.storeRefreshToken(user.rows[0].id, tokens.refreshToken);

      return {
        user: {
          id: user.rows[0].id,
          email: user.rows[0].email,
          username: user.rows[0].username,
          status: user.rows[0].status,
        },
        ...tokens,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(identifier, password) {
    const user = await userRepository.findByEmailOrUsername(identifier);
    if (!user) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (user.status !== 'active') {
      throw new AuthError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const tokens = this.generateTokens(user.id);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        status: user.status,
      },
      ...tokens,
    };
  }

  async logout(userId, refreshToken) {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND token_hash = $2`,
        [userId, tokenHash]
      );
    }
    return true;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AuthError('Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const result = await pool.query(
      `SELECT rt.*, u.status FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (!result.rows[0]) {
      throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    const token = result.rows[0];
    if (token.status !== 'active') {
      throw new AuthError('Account is not active', 'ACCOUNT_INACTIVE');
    }

    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
      [token.id]
    );

    const tokens = this.generateTokens(token.user_id);
    await this.storeRefreshToken(token.user_id, tokens.refreshToken);

    return tokens;
  }

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    const profile = await profileRepository.findByUserId(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      emailVerifiedAt: user.email_verified_at,
      createdAt: user.created_at,
      profile: profile ? {
        displayName: profile.display_name,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        coverUrl: profile.cover_url,
        websiteUrl: profile.website_url,
        location: profile.location,
      } : null,
    };
  }

  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.accessExpiresIn }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(userId, refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  async revokeAllRefreshTokens(userId) {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      throw new AuthError('Current password is incorrect', 'INVALID_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await userRepository.update(userId, { passwordHash });
    await this.revokeAllRefreshTokens(userId);

    return true;
  }
}

export const authService = new AuthService();