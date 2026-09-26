const User = {
  tableName: 'users',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    email: 'VARCHAR(255) NOT NULL',
    username: 'VARCHAR(30) NOT NULL',
    passwordHash: 'TEXT NOT NULL',
    status: "user_status NOT NULL DEFAULT 'active'",
    emailVerifiedAt: 'TIMESTAMPTZ',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    deletedAt: 'TIMESTAMPTZ',
  },
  constraints: [
    'CONSTRAINT users_email_unique UNIQUE (email)',
    'CONSTRAINT users_username_unique UNIQUE (username)',
    'CONSTRAINT users_email_not_blank CHECK (length(trim(email)) > 0)',
    'CONSTRAINT users_username_format CHECK (username ~ \'^[a-zA-Z0-9_]{3,30}$\')',
  ],
  indexes: [
    'CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email))',
    'CREATE UNIQUE INDEX users_username_lower_unique ON users (LOWER(username))',
  ],
};

const RefreshToken = {
  tableName: 'refresh_tokens',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    userId: 'UUID NOT NULL',
    tokenHash: 'TEXT NOT NULL',
    expiresAt: 'TIMESTAMPTZ NOT NULL',
    revokedAt: 'TIMESTAMPTZ',
    createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    lastUsedAt: 'TIMESTAMPTZ',
    userAgent: 'TEXT',
    ipAddress: 'INET',
  },
  constraints: [
    'CONSTRAINT refresh_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'CONSTRAINT refresh_tokens_token_hash_unique UNIQUE (token_hash)',
  ],
  indexes: [
    'CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id)',
    'CREATE INDEX idx_refresh_tokens_active ON refresh_tokens (user_id, expires_at) WHERE revoked_at IS NULL',
  ],
};

export { User, RefreshToken };