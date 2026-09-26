const PostBookmark = {
  tableName: 'post_bookmarks',
  columns: {
    userId: 'UUID NOT NULL',
    postId: 'UUID NOT NULL',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  },
  constraints: [
    'PRIMARY KEY (user_id, post_id)',
    'CONSTRAINT post_bookmarks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'CONSTRAINT post_bookmarks_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
  ],
  indexes: [
    'CREATE INDEX idx_post_bookmarks_user_created ON post_bookmarks (user_id, created_at DESC)',
  ],
};

export { PostBookmark };