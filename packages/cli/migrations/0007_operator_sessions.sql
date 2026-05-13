-- ClientPad operator sessions
-- Cookie-backed dashboard sessions for operator/admin access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS operator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_sessions_user_id_idx
  ON operator_sessions(user_id);

CREATE INDEX IF NOT EXISTS operator_sessions_expires_at_idx
  ON operator_sessions(expires_at);

