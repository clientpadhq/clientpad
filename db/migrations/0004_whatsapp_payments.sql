-- WhatsApp payment records and Nigerian payment-provider webhooks.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE payment_provider AS ENUM ('paystack', 'flutterwave');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'lead_status'::regtype
      AND enumlabel = 'paid'
  ) THEN
    ALTER TYPE lead_status ADD VALUE 'paid';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  provider_reference text NOT NULL,
  provider_payment_id text,
  status payment_status NOT NULL DEFAULT 'pending',
  amount numeric(14, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  service_item_reference text NOT NULL,
  customer_phone text NOT NULL,
  customer_name text NOT NULL,
  payment_url text,
  provider_event text,
  webhook_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS payments_workspace_id_created_at_idx
  ON payments(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payments_lead_id_idx
  ON payments(lead_id);

CREATE INDEX IF NOT EXISTS payments_status_idx
  ON payments(status);
