-- 017_link_media_to_features.sql
-- Phase 03: connect the media table to the features that display images.
--
-- The existing `profiles.avatar_url` / `profiles.cover_url` /
-- `posts.image_url` TEXT columns are kept. They remain the source of
-- truth for images supplied as an external URL, while the new UUID
-- columns are the source of truth for images uploaded through the
-- Phase 01 media API.
--
-- Both are exposed to the client, which resolves an uploaded image via
-- `GET /api/v1/media/:id/content`. Storing no absolute URL means a host
-- or proxy change never breaks already-uploaded media, and no read
-- query has to join `media` just to build a URL.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS avatar_media_id UUID REFERENCES media(id) ON DELETE SET NULL;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS banner_media_id UUID REFERENCES media(id) ON DELETE SET NULL;

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS image_media_id UUID REFERENCES media(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_avatar_media ON profiles (avatar_media_id) WHERE avatar_media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_banner_media ON profiles (banner_media_id) WHERE banner_media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_image_media ON posts (image_media_id) WHERE image_media_id IS NOT NULL;

-- Supports the orphan sweep: media owned by a user that no longer
-- matches any profile or post reference.
CREATE INDEX IF NOT EXISTS idx_media_owner_type_created ON media (owner_id, media_type, created_at DESC);
