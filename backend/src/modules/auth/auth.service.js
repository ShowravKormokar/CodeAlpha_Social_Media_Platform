import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../../config/database.js';
import { env } from '../../config/env.js';
import { userRepository } from '../users/user.repository.js';
import { profileRepository } from '../users/profile.repository.js';
import { AuthError, ConflictError, ValidationError } from '../../errors/AppError.js';

const SALT_ROUNDS = 12;

const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

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
    const emailVerificationToken = this.generateVerificationToken();
    const emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await client.query(
        `INSERT INTO users (email, username, password_hash, email_verification_token, email_verification_expires)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, username, status, email_verified_at, created_at, updated_at`,
        [data.email.toLowerCase(), data.username.toLowerCase(), passwordHash, emailVerificationToken, emailVerificationExpires]
      );

      // Update profile with display_name if provided
      if (data.name) {
        await client.query(
          `UPDATE profiles SET display_name = $1 WHERE user_id = $2`,
          [data.name.trim(), user.rows[0].id]
        );
      }

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
        emailVerificationToken,
        emailVerificationExpires: emailVerificationExpires.toISOString(),
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

  async logout(refreshToken) {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
    }
    return true;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AuthError('Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT rt.id, rt.user_id, u.status FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
         FOR UPDATE OF rt`,
        [tokenHash]
      );

      if (!result.rows[0]) {
        throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
      }

      const token = result.rows[0];
      if (token.status !== 'active') {
        throw new AuthError('Account is not active', 'ACCOUNT_INACTIVE');
      }

      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
        [token.id]
      );

      const tokens = this.generateTokens(token.user_id);
      await this.storeRefreshToken(token.user_id, tokens.refreshToken, client);
      await client.query('COMMIT');

      return tokens;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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

    const decoded = jwt.decode(accessToken);

    return {
      accessToken,
      accessTokenExpiresAt: decoded.exp * 1000,
      refreshToken,
    };
  }

  async storeRefreshToken(userId, refreshToken, queryable = pool) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + env.cookie.refreshMaxAge);

    await queryable.query(
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

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendEmailVerification(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    if (user.email_verified_at) {
      throw new ValidationError('Email already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    const token = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3`,
      [token, expiresAt, userId]
    );

    // TODO: Send email with verification link
    // For now, return token for testing
    return { token, expiresAt };
  }

  async verifyEmail(token) {
    if (!token) {
      throw new ValidationError('Verification token required', 'TOKEN_REQUIRED');
    }

    const result = await pool.query(
      `SELECT id, email, email_verified_at FROM users 
       WHERE email_verification_token = $1 AND email_verification_expires > NOW()`,
      [token]
    );

    if (!result.rows[0]) {
      throw new ValidationError('Invalid or expired verification token', 'INVALID_TOKEN');
    }

    const user = result.rows[0];
    if (user.email_verified_at) {
      throw new ValidationError('Email already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    await pool.query(
      `UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1`,
      [user.id]
    );

    return { message: 'Email verified successfully' };
  }

  async resendEmailVerification(userId) {
    return this.sendEmailVerification(userId);
  }

  async resendEmailVerificationByEmail(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a verification email has been sent' };
    }

    if (user.email_verified_at) {
      throw new ValidationError('Email already verified', 'EMAIL_ALREADY_VERIFIED');
    }

    return this.sendEmailVerification(user.id);
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const token = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3`,
      [token, expiresAt, user.id]
    );

    // TODO: Send email with reset link
    // For now, return token for testing
    return { token, expiresAt, message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token, newPassword) {
    if (!token) {
      throw new ValidationError('Reset token required', 'TOKEN_REQUIRED');
    }

    const result = await pool.query(
      `SELECT id FROM users 
       WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );

    if (!result.rows[0]) {
      throw new ValidationError('Invalid or expired reset token', 'INVALID_TOKEN');
    }

    const userId = result.rows[0].id;
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
      [passwordHash, userId]
    );

    await this.revokeAllRefreshTokens(userId);

    return { message: 'Password reset successfully' };
  }
}

export const authService = new AuthService();