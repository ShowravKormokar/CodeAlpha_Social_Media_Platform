import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError } from '../errors/AppError.js';
import { pool } from '../config/database.js';

export async function authMiddleware(req, res, next) {
  const token = req.cookies?.[env.cookie.name];

  if (!token) {
    throw new AuthError('Authentication required', 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const result = await pool.query('SELECT id, email, username FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new AuthError('Token expired', 'TOKEN_EXPIRED');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new AuthError('Invalid token', 'INVALID_TOKEN');
    }
    throw new AuthError('Authentication failed', 'AUTH_FAILED');
  }
}

export function optionalAuthMiddleware(req, res, next) {
  const token = req.cookies?.[env.cookie.name];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: decoded.userId };
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
}