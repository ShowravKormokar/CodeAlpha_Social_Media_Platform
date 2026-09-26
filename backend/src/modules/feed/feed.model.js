const Feed = {
  description: 'Feed module uses Post and UserFollow models for generating personalized feeds',
  query: `
    SELECT p.*, u.username, pr.display_name, pr.avatar_url,
           (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND deleted_at IS NULL) as comments_count,
           (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as user_liked
    FROM posts p
    JOIN users u ON u.id = p.user_id
    JOIN profiles pr ON pr.user_id = u.id
    WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status = 'active'
      AND (p.user_id = $1 OR p.user_id IN (
        SELECT following_id FROM user_follows WHERE follower_id = $1
      ))
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `,
};

export { Feed };