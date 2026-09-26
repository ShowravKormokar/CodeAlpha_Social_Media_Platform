import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already executed migrations
    const executedResult = await client.query('SELECT name FROM _migrations');
    const executed = new Set(executedResult.rows.map(r => r.name));

    // Get all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    logger.info(`Found ${files.length} migration files`);

    for (const file of files) {
      if (executed.has(file)) {
        logger.debug({ file }, 'Migration already executed, skipping');
        continue;
      }

      logger.info({ file }, 'Running migration');
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        logger.info({ file }, 'Migration completed');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err, file }, 'Migration failed');
        throw err;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (err) {
    logger.error({ err }, 'Migration process failed');
    throw err;
  } finally {
    client.release();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));