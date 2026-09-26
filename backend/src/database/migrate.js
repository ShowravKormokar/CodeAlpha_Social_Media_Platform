import { pool } from '../config/database.js';
import { logger } from '../config/logger.js';

const migrations = [
  // 0. Extensions
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,

  // 1. Enum types
  `CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deactivated');`,
  `CREATE TYPE notification_type AS ENUM ('follow', 'like', 'comment');`,
  `CREATE TYPE report_target_type AS ENUM ('post', 'comment', 'user');`,
  `CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'rejected');`,

  // 2. Users
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(30) NOT NULL,
    password_hash TEXT NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_username_unique UNIQUE (username),
    CONSTRAINT users_email_not_blank CHECK (length(trim(email)) > 0),
    CONSTRAINT users_username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,30}$')
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email));`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username));`,

  // 3. Profiles
  `CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    bio VARCHAR(500),
    avatar_url TEXT,
    cover_url TEXT,
    website_url TEXT,
    location VARCHAR(150),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT profiles_display_name_not_blank CHECK (length(trim(display_name)) > 0)
  );`,

  // 4. Refresh tokens
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_address INET,
    CONSTRAINT refresh_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens (user_id, expires_at) WHERE revoked_at IS NULL;`,

  // 5. Posts
  `CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT posts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT posts_content_not_blank CHECK (length(trim(content)) > 0),
    CONSTRAINT posts_content_length CHECK (char_length(content) <= 5000)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts (user_id, created_at DESC) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC) WHERE deleted_at IS NULL;`,

  // 6. Comments
  `CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT comments_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT comments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT comments_content_not_blank CHECK (length(trim(content)) > 0),
    CONSTRAINT comments_content_length CHECK (char_length(content) <= 2000)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments (post_id, created_at DESC) WHERE deleted_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments (user_id, created_at DESC) WHERE deleted_at IS NULL;`,

  // 7. Post likes
  `CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT post_likes_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT post_likes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  `CREATE INDEX IF NOT EXISTS idx_post_likes_post_created ON post_likes (post_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_post_likes_user_created ON post_likes (user_id, created_at DESC);`,

  // 8. User follows
  `CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT user_follows_follower_fk FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_following_fk FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_user_follows_follower_created ON user_follows (follower_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_user_follows_following_created ON user_follows (following_id, created_at DESC);`,

  // 9. Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL,
    actor_id UUID,
    type notification_type NOT NULL,
    post_id UUID,
    comment_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CONSTRAINT notifications_recipient_fk FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT notifications_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT notifications_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT notifications_comment_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT notifications_not_self CHECK (actor_id IS NULL OR actor_id <> recipient_id),
    CONSTRAINT notifications_read_consistency CHECK (
      (is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE AND read_at IS NOT NULL)
    )
  );`,

  `CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (recipient_id, created_at DESC) WHERE is_read = FALSE;`,

  // 10. Bookmarks
  `CREATE TABLE IF NOT EXISTS post_bookmarks (
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id),
    CONSTRAINT post_bookmarks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT post_bookmarks_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );`,

  `CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_created ON post_bookmarks (user_id, created_at DESC);`,

  // 11. Reports
  `CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    target_type report_target_type NOT NULL,
    post_id UUID,
    comment_id UUID,
    reported_user_id UUID,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT reports_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT reports_comment_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT reports_reported_user_fk FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT reports_reviewer_fk FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT reports_target_consistency CHECK (
      (target_type = 'post' AND post_id IS NOT NULL AND comment_id IS NULL AND reported_user_id IS NULL)
      OR (target_type = 'comment' AND post_id IS NULL AND comment_id IS NOT NULL AND reported_user_id IS NULL)
      OR (target_type = 'user' AND post_id IS NULL AND comment_id IS NULL AND reported_user_id IS NOT NULL)
    )
  );`,

  `CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports (status, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_reports_reporter_created ON reports (reporter_id, created_at DESC);`,

  `CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_post_unique ON reports (reporter_id, post_id) WHERE target_type = 'post' AND status = 'pending';`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_comment_unique ON reports (reporter_id, comment_id) WHERE target_type = 'comment' AND status = 'pending';`,
  `CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_user_unique ON reports (reporter_id, reported_user_id) WHERE target_type = 'user' AND status = 'pending';`,

  // 12. Updated at trigger
  `CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$;`,

  `DROP TRIGGER IF EXISTS trg_users_updated_at ON users;`,
  `CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,

  `DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;`,
  `CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,

  `DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;`,
  `CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,

  `DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;`,
  `CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,

  // 13. Automatic profile creation
  `CREATE OR REPLACE FUNCTION create_default_profile()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
  BEGIN
      INSERT INTO profiles (user_id, display_name)
      VALUES (NEW.id, NEW.username);
      RETURN NEW;
  END;
  $$;`,

  `DROP TRIGGER IF EXISTS trg_users_create_profile ON users;`,
  `CREATE TRIGGER trg_users_create_profile AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_default_profile();`,

  // 14. Notification type consistency
  `ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_consistency;
  ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_consistency CHECK (
    (type = 'follow' AND actor_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL)
    OR (type = 'like' AND actor_id IS NOT NULL AND post_id IS NOT NULL AND comment_id IS NULL)
    OR (type = 'comment' AND actor_id IS NOT NULL AND post_id IS NOT NULL AND comment_id IS NOT NULL)
  );`,

  // 15. Active posts with author view
  `CREATE OR REPLACE VIEW active_posts_with_author AS
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.created_at,
    p.updated_at,
    u.username,
    pr.display_name,
    pr.avatar_url
  FROM posts p
  JOIN users u ON u.id = p.user_id
  JOIN profiles pr ON pr.user_id = u.id
  WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active';`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const migration of migrations) {
      await client.query(migration);
    }
    await client.query('COMMIT');
    logger.info('Migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Migration failed');
    throw err;
  } finally {
    client.release();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));