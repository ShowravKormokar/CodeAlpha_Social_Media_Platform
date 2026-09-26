import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError } from '../errors/AppError.js';
import { pool } from '../config/database.js';

export async function authMiddleware(req, res, next) {
  try {
    let token = req.cookies?.[env.cookie.name];

    // Also check Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new AuthError('Authentication required', 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, env.jwt.accessSecret);
    const result = await pool.query('SELECT id, email, username FROM users WHERE id = $1 AND deleted_at IS NULL AND status = \'active\'', [decoded.userId]);
    
    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND');
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      next(err);
    } else if (err.name === 'TokenExpiredError') {
      next(new AuthError('Token expired', 'TOKEN_EXPIRED'));
    } else if (err.name === 'JsonWebTokenError') {
      next(new AuthError('Invalid token', 'INVALID_TOKEN'));
    } else {
      next(new AuthError('Authentication failed', 'AUTH_FAILED'));
    }
  }
}

export function optionalAuthMiddleware(req, res, next) {
  let token = req.cookies?.[env.cookie.name];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

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