const Post = {
  tableName: 'posts',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    userId: 'UUID NOT NULL',
    content: 'TEXT NOT NULL',
    imageUrl: 'TEXT',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    deletedAt: 'TIMESTAMPTZ',
  },
  constraints: [
    'CONSTRAINT posts_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'CONSTRAINT posts_content_not_blank CHECK (length(trim(content)) > 0)',
    'CONSTRAINT posts_content_length CHECK (char_length(content) <= 5000)',
  ],
  indexes: [
    'CREATE INDEX idx_posts_user_created ON posts (user_id, created_at DESC) WHERE deleted_at IS NULL',
    'CREATE INDEX idx_posts_created ON posts (created_at DESC) WHERE deleted_at IS NULL',
  ],
};

const Comment = {
  tableName: 'comments',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    postId: 'UUID NOT NULL',
    userId: 'UUID NOT NULL',
    content: 'TEXT NOT NULL',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    deletedAt: 'TIMESTAMPTZ',
  },
  constraints: [
    'CONSTRAINT comments_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
    'CONSTRAINT comments_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'CONSTRAINT comments_content_not_blank CHECK (length(trim(content)) > 0)',
    'CONSTRAINT comments_content_length CHECK (char_length(content) <= 2000)',
  ],
  indexes: [
    'CREATE INDEX idx_comments_post_created ON comments (post_id, created_at DESC) WHERE deleted_at IS NULL',
    'CREATE INDEX idx_comments_user_created ON comments (user_id, created_at DESC) WHERE deleted_at IS NULL',
  ],
};

export { Post, Comment };