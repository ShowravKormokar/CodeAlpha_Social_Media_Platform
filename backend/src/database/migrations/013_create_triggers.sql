-- 013_create_triggers.sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION create_default_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO profiles (user_id, display_name)
    VALUES (NEW.id, NEW.username);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_create_profile ON users;
CREATE TRIGGER trg_users_create_profile AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_default_profile();

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_consistency;
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_consistency CHECK (
    (type = 'follow' AND actor_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL)
    OR (type = 'like' AND actor_id IS NOT NULL AND post_id IS NOT NULL AND comment_id IS NULL)
    OR (type = 'comment' AND actor_id IS NOT NULL AND post_id IS NOT NULL AND comment_id IS NOT NULL)
);