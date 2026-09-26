-- 009_create_user_follows.sql
CREATE TABLE user_follows (
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT user_follows_follower_fk FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_following_fk FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX idx_user_follows_follower_created ON user_follows (follower_id, created_at DESC);
CREATE INDEX idx_user_follows_following_created ON user_follows (following_id, created_at DESC);