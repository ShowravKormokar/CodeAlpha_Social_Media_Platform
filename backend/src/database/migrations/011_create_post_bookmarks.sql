-- 011_create_post_bookmarks.sql
CREATE TABLE post_bookmarks (
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id),
    CONSTRAINT post_bookmarks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT post_bookmarks_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_bookmarks_user_created ON post_bookmarks (user_id, created_at DESC);