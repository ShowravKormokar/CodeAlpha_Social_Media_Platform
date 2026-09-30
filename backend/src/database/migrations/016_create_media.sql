-- 016_create_media.sql
-- Phase 01 media foundation (IMAGEPLAN.md).
-- Stores metadata and the storage key only. Image binaries are
-- never stored in PostgreSQL.

CREATE TYPE media_type AS ENUM ('profile_avatar', 'profile_banner', 'post_image');

CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    media_type media_type NOT NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
    storage_key TEXT NOT NULL,
    original_filename TEXT,
    original_mime_type VARCHAR(127),
    mime_type VARCHAR(127) NOT NULL,
    size_bytes INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT media_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT media_storage_key_unique UNIQUE (storage_provider, storage_key),
    CONSTRAINT media_size_positive CHECK (size_bytes > 0),
    CONSTRAINT media_dimensions_positive CHECK (width > 0 AND height > 0)
);

CREATE INDEX idx_media_owner_created ON media (owner_id, created_at DESC);
CREATE INDEX idx_media_owner_type ON media (owner_id, media_type);
CREATE INDEX idx_media_created ON media (created_at DESC);

DROP TRIGGER IF EXISTS trg_media_updated_at ON media;
CREATE TRIGGER trg_media_updated_at BEFORE UPDATE ON media FOR EACH ROW EXECUTE FUNCTION set_updated_at();
