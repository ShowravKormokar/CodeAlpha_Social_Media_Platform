-- 004_create_profiles.sql
CREATE TABLE profiles (
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
);