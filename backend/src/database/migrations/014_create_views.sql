-- 014_create_views.sql
CREATE OR REPLACE VIEW active_posts_with_author AS
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
WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active';