import pino from 'pino';
import { env } from './env.js';

const isDevelopment = env.nodeEnv === 'development';
const redact = {
  paths: [
    'req.headers.cookie',
    'req.headers.authorization',
    'res.headers.set-cookie',
  ],
  censor: '[REDACTED]',
};

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  redact,
  transport: isDevelopment
    ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pino({
  level: isDevelopment ? 'debug' : 'info',
  redact,
  transport: isDevelopment
    ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
    : undefined,
});