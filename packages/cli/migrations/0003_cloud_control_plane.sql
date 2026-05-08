-- ClientPad Cloud control plane
-- Optional hosted infrastructure layer for managed projects, plans, and billing state.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cloud_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  environment text NOT NULL DEFAULT 'production',
  owner_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_projects_workspace_id_idx
  ON cloud_projects(workspace_id);

CREATE TABLE IF NOT EXISTS cloud_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  monthly_request_limit integer,
  rate_limit_per_minute integer,
  included_projects integer NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cloud_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES cloud_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text UNIQUE,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_subscriptions_status_check CHECK (
    status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')
  )
);

CREATE INDEX IF NOT EXISTS cloud_subscriptions_workspace_id_idx
  ON cloud_subscriptions(workspace_id);

CREATE TABLE IF NOT EXISTS cloud_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cloud_plans (
  code,
  name,
  monthly_price_cents,
  currency,
  monthly_request_limit,
  rate_limit_per_minute,
  included_projects,
  features
)
VALUES
  ('free', 'Free', 0, 'USD', 1000, 60, 1, '{"support":"community","logs_days":7}'::jsonb),
  ('developer', 'Developer', 1900, 'USD', 100000, 300, 3, '{"support":"email","logs_days":30,"webhooks":true}'::jsonb),
  ('business', 'Business', 9900, 'USD', 1000000, 1200, 10, '{"support":"priority","logs_days":90,"webhooks":true,"backups":true}'::jsonb),
  ('enterprise', 'Enterprise', 0, 'USD', null, null, 999, '{"support":"sla","logs_days":365,"dedicated_infra":true}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  currency = EXCLUDED.currency,
  monthly_request_limit = EXCLUDED.monthly_request_limit,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  included_projects = EXCLUDED.included_projects,
  features = EXCLUDED.features,
  active = true,
  updated_at = now();
