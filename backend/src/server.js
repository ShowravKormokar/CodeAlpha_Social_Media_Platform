import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closePool } from './config/database.js';

const server = app.listen(env.port, () => {
  logger.info(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
});

async function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);
  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await closePool();
      logger.info('Database pool closed');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default server;