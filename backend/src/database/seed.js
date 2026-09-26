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
      { email: 'eve@example.com', username: 'eve', name: 'Eve Wilson' },
      { email: 'frank@example.com', username: 'frank', name: 'Frank Miller' },
      { email: 'grace@example.com', username: 'grace', name: 'Grace Lee' },
      { email: 'henry@example.com', username: 'henry', name: 'Henry Davis' },
      { email: 'iris@example.com', username: 'iris', name: 'Iris Chen' },
    ];

    const userIds = [];
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash
         RETURNING id, username`,
        [user.email, user.username, passwordHash]
      );
      userIds.push({ id: result.rows[0].id, username: result.rows[0].username, name: user.name });
    }

    for (const user of userIds) {
      await client.query(
        `INSERT INTO profiles (user_id, display_name, bio, location, website_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET 
           display_name = EXCLUDED.display_name,
           bio = EXCLUDED.bio,
           location = EXCLUDED.location,
           website_url = EXCLUDED.website_url`,
        [user.id, user.name, `Hello, I'm ${user.name}! Software developer and tech enthusiast.`, 'San Francisco, CA', 'https://example.com']
      );
    }

    const posts = [
      { userId: userIds[0].id, content: 'Just launched our new social media platform! 🚀 Excited to see what the community builds.', imageUrl: null },
      { userId: userIds[1].id, content: 'Beautiful sunset today. Sometimes you just need to pause and appreciate the little things. 🌅', imageUrl: null },
      { userId: userIds[2].id, content: 'Working on a new React project. The developer experience has improved so much over the years!', imageUrl: null },
      { userId: userIds[3].id, content: 'Coffee ☕ + Code 💻 = Perfect morning. What\'s your favorite coding fuel?', imageUrl: null },
      { userId: userIds[4].id, content: 'Just finished reading "Clean Code" by Robert Martin. Highly recommended for every developer!', imageUrl: null },
      { userId: userIds[5].id, content: 'Hiking in the mountains this weekend. Nature is the best debugger for a tired mind. 🏔️', imageUrl: null },
      { userId: userIds[6].id, content: 'TypeScript has changed how I write JavaScript. Static typing catches so many bugs early.', imageUrl: null },
      { userId: userIds[7].id, content: 'Started learning Rust this week. The ownership model is fascinating but challenging!', imageUrl: null },
      { userId: userIds[8].id, content: 'Deployed my first Kubernetes cluster today. The learning curve is steep but worth it. 🐳', imageUrl: null },
      { userId: userIds[9].id, content: 'Remember: code is read more often than it\'s written. Write for humans, not machines.', imageUrl: null },
    ];

    const postIds = [];
    for (const post of posts) {
      const result = await client.query(
        `INSERT INTO posts (user_id, content, image_url) VALUES ($1, $2, $3) RETURNING id`,
        [post.userId, post.content, post.imageUrl]
      );
      postIds.push(result.rows[0].id);
    }

    for (let i = 0; i < 30; i++) {
      const postId = postIds[Math.floor(Math.random() * postIds.length)];
      const userId = userIds[Math.floor(Math.random() * userIds.length)].id;
      const comments = [
        'Great post!', 'Thanks for sharing!', 'Couldn\'t agree more.', 'Interesting perspective!',
        'This is exactly what I needed to hear.', 'Love this!', 'Very insightful.', 'Keep it up!',
        'Bookmarking this for later.', 'Well said!', 'First time seeing this, thanks!',
        'This resonates with me.', 'Excellent point!', 'Mind blown 🤯', 'So true!'
      ];
      await client.query(
        `INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3)`,
        [postId, userId, comments[Math.floor(Math.random() * comments.length)]]
      );
    }

    for (let i = 0; i < 50; i++) {
      const postId = postIds[Math.floor(Math.random() * postIds.length)];
      const userId = userIds[Math.floor(Math.random() * userIds.length)].id;
      await client.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [postId, userId]
      );
    }

    for (let i = 0; i < 20; i++) {
      const followerId = userIds[Math.floor(Math.random() * userIds.length)].id;
      const followingId = userIds[Math.floor(Math.random() * userIds.length)].id;
      if (followerId !== followingId) {
        await client.query(
          `INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [followerId, followingId]
        );
      }
    }

    for (let i = 0; i < 15; i++) {
      const postId = postIds[Math.floor(Math.random() * postIds.length)];
      const userId = userIds[Math.floor(Math.random() * userIds.length)].id;
      await client.query(
        `INSERT INTO post_bookmarks (user_id, post_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, postId]
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