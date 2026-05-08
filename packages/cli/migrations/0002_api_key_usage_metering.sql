-- ClientPad hosted gateway usage metering
-- Optional limits let self-hosted deployments remain free and unlimited.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'self_hosted',
  ADD COLUMN IF NOT EXISTS monthly_request_limit integer,
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute integer;

ALTER TABLE api_keys
  DROP CONSTRAINT IF EXISTS api_keys_billing_mode_check;

ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_billing_mode_check
  CHECK (billing_mode IN ('self_hosted', 'cloud_free', 'cloud_paid', 'cloud_enterprise'));

CREATE TABLE IF NOT EXISTS api_key_usage_months (
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month date NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (api_key_id, month)
);

CREATE INDEX IF NOT EXISTS api_key_usage_months_workspace_month_idx
  ON api_key_usage_months(workspace_id, month DESC);

CREATE TABLE IF NOT EXISTS api_key_rate_limit_windows (
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (api_key_id, window_start)
);

CREATE TABLE IF NOT EXISTS api_key_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  route text NOT NULL,
  method text NOT NULL,
  status_code integer,
  billable boolean NOT NULL DEFAULT true,
  rejected_reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_key_usage_events_workspace_created_at_idx
  ON api_key_usage_events(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS api_key_usage_events_api_key_created_at_idx
  ON api_key_usage_events(api_key_id, created_at DESC);
