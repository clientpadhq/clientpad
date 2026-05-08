-- ClientPad API key gateway
-- PostgreSQL-only, no Supabase dependency.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  public_prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  last_used_ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_workspace_id_idx ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS api_keys_public_prefix_idx ON api_keys(public_prefix) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS api_key_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_key_audit_events_workspace_id_created_at_idx
  ON api_key_audit_events(workspace_id, created_at DESC);
