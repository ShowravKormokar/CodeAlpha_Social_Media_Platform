-- 007_create_comments.sql
CREATE TABLE comments (
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
);

CREATE INDEX idx_comments_post_created ON comments (post_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user_created ON comments (user_id, created_at DESC) WHERE deleted_at IS NULL;