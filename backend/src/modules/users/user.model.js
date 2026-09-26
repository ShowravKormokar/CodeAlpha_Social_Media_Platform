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

const Profile = {
  tableName: 'profiles',
  columns: {
    userId: 'UUID PRIMARY KEY',
    displayName: 'VARCHAR(100) NOT NULL',
    bio: 'VARCHAR(500)',
    avatarUrl: 'TEXT',
    coverUrl: 'TEXT',
    websiteUrl: 'TEXT',
    location: 'VARCHAR(150)',
    updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  },
  constraints: [
    'CONSTRAINT profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'CONSTRAINT profiles_display_name_not_blank CHECK (length(trim(display_name)) > 0)',
  ],
  indexes: [],
};

export { User, Profile };