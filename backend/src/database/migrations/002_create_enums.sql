-- 002_create_enums.sql
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deactivated');
CREATE TYPE notification_type AS ENUM ('follow', 'like', 'comment');
CREATE TYPE report_target_type AS ENUM ('post', 'comment', 'user');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'rejected');