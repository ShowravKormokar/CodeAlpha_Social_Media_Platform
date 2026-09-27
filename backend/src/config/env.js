import { config } from 'dotenv';
config();

const durationUnits = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

function durationToMs(value) {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid token duration: ${value}`);
  }

  return Math.floor(Number(match[1]) * durationUnits[match[2].toLowerCase()]);
}

const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/social_media',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    accessExpiresIn,
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn,
  },

  cookie: {
    name: process.env.COOKIE_NAME || 'access_token',
    refreshName: process.env.REFRESH_COOKIE_NAME || 'refresh_token',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: durationToMs(accessExpiresIn),
    refreshMaxAge: durationToMs(refreshExpiresIn),
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : 'http://localhost:5500',
    credentials: true,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};