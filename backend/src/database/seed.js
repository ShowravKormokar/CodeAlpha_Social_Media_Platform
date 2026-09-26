import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';
import bcrypt from 'bcrypt';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      { email: 'admin@example.com', username: 'admin', name: 'Admin User' },
      { email: 'alice@example.com', username: 'alice', name: 'Alice Smith' },
      { email: 'bob@example.com', username: 'bob', name: 'Bob Johnson' },
      { email: 'charlie@example.com', username: 'charlie', name: 'Charlie Brown' },
      { email: 'diana@example.com', username: 'diana', name: 'Diana Prince' },
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [user.email, user.username, passwordHash]
      );
    }

    const userResult = await client.query('SELECT id, username FROM users');
    const userMap = {};
    userResult.rows.forEach(u => { userMap[u.username] = u.id; });

    for (const [username, userId] of Object.entries(userMap)) {
      await client.query(
        `INSERT INTO profiles (user_id, display_name, bio) VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, username.charAt(0).toUpperCase() + username.slice(1), `Hello, I'm ${username}!`]
      );
    }

    await client.query('COMMIT');
    logger.info('Seed data created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Seed failed');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));