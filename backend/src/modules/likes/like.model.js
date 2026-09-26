const PostLike = {
  tableName: 'post_likes',
  columns: {
    postId: 'UUID NOT NULL',
    userId: 'UUID NOT NULL',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  },
  constraints: [
    'PRIMARY KEY (post_id, user_id)',
    'CONSTRAINT post_likes_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
    'CONSTRAINT post_likes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  ],
  indexes: [
    'CREATE INDEX idx_post_likes_post_created ON post_likes (post_id, created_at DESC)',
    'CREATE INDEX idx_post_likes_user_created ON post_likes (user_id, created_at DESC)',
  ],
};

export { PostLike };