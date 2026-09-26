const Notification = {
  tableName: 'notifications',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    recipientId: 'UUID NOT NULL',
    actorId: 'UUID',
    type: "notification_type NOT NULL",
    postId: 'UUID',
    commentId: 'UUID',
    isRead: 'BOOLEAN NOT NULL DEFAULT FALSE',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    readAt: 'TIMESTAMPTZ',
  },
  constraints: [
    'CONSTRAINT notifications_recipient_fk FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE',
    'CONSTRAINT notifications_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL',
    'CONSTRAINT notifications_post_fk FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE',
    'CONSTRAINT notifications_comment_fk FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE',
    'CONSTRAINT notifications_not_self CHECK (actor_id IS NULL OR actor_id <> recipient_id)',
    'CONSTRAINT notifications_read_consistency CHECK ((is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE AND read_at IS NOT NULL))',
    'CONSTRAINT notifications_type_consistency CHECK ((type = \'follow\' AND actor_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL) OR (type = \'like\' AND actor_id IS NOT NULL AND post_id IS NOT NULL AND comment_id IS NULL) OR (type = \'comment\' AND actor_id IS NOT NULL AND post_id IS NOT NULL AND comment_id IS NOT NULL))',
  ],
  indexes: [
    'CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC)',
    'CREATE INDEX idx_notifications_unread ON notifications (recipient_id, created_at DESC) WHERE is_read = FALSE',
  ],
};

export { Notification };