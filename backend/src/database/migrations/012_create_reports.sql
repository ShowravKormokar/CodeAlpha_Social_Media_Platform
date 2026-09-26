-- 012_create_reports.sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL,
    target_type report_target_type NOT NULL,
    post_id UUID,
    comment_id UUID,
    reported_user_id UUID,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reports_reporter_fk FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT reports_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT reports_comment_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT reports_reported_user_fk FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT reports_reviewer_fk FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT reports_target_consistency CHECK (
        (target_type = 'post' AND post_id IS NOT NULL AND comment_id IS NULL AND reported_user_id IS NULL)
        OR (target_type = 'comment' AND post_id IS NULL AND comment_id IS NOT NULL AND reported_user_id IS NULL)
        OR (target_type = 'user' AND post_id IS NULL AND comment_id IS NULL AND reported_user_id IS NOT NULL)
    )
);

CREATE INDEX idx_reports_status_created ON reports (status, created_at DESC);
CREATE INDEX idx_reports_reporter_created ON reports (reporter_id, created_at DESC);

CREATE UNIQUE INDEX reports_pending_post_unique ON reports (reporter_id, post_id) WHERE target_type = 'post' AND status = 'pending';
CREATE UNIQUE INDEX reports_pending_comment_unique ON reports (reporter_id, comment_id) WHERE target_type = 'comment' AND status = 'pending';
CREATE UNIQUE INDEX reports_pending_user_unique ON reports (reporter_id, reported_user_id) WHERE target_type = 'user' AND status = 'pending';