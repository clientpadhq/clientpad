-- ClientPad WhatsApp workflows
-- Adds WhatsApp conversations, service catalog, bookings, and payment workflow tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_stage') THEN
    CREATE TYPE pipeline_stage AS ENUM (
      'new_lead',
      'quoted',
      'booked',
      'in_progress',
      'completed',
      'paid',
      'review_requested'
    );
  END IF;
END $$;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pipeline_stage pipeline_stage DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS whatsapp_wa_id text,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS ai_summary text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_workspace_id_phone_unique_idx
  ON leads(workspace_id, phone)
  WHERE phone IS NOT NULL AND btrim(phone) <> '';

CREATE INDEX IF NOT EXISTS leads_workspace_id_pipeline_stage_updated_at_idx
  ON leads(workspace_id, pipeline_stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS leads_workspace_id_whatsapp_wa_id_idx
  ON leads(workspace_id, whatsapp_wa_id)
  WHERE whatsapp_wa_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_number_id text NOT NULL,
  waba_id text NOT NULL,
  display_phone_number text,
  access_token_secret_name text NOT NULL,
  webhook_verify_token_hash text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_accounts_status_check CHECK (
    status IN ('active', 'inactive', 'pending', 'revoked')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_accounts_workspace_id_phone_number_id_idx
  ON whatsapp_accounts(workspace_id, phone_number_id);

CREATE INDEX IF NOT EXISTS whatsapp_accounts_workspace_id_status_idx
  ON whatsapp_accounts(workspace_id, status);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone text NOT NULL,
  wa_id text,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_conversations_status_check CHECK (
    status IN ('open', 'pending', 'closed', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_workspace_id_last_message_at_idx
  ON whatsapp_conversations(workspace_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_workspace_id_status_idx
  ON whatsapp_conversations(workspace_id, status);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_lead_id_idx
  ON whatsapp_conversations(lead_id);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_client_id_idx
  ON whatsapp_conversations(client_id);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_workspace_id_wa_id_idx
  ON whatsapp_conversations(workspace_id, wa_id)
  WHERE wa_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  meta_message_id text,
  message_type text NOT NULL,
  message_text text,
  interactive_payload jsonb,
  media_metadata jsonb,
  location_payload jsonb,
  raw_payload jsonb NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_messages_direction_check CHECK (
    direction IN ('inbound', 'outbound', 'system')
  )
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_id_created_at_idx
  ON whatsapp_messages(conversation_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_meta_message_id_idx
  ON whatsapp_messages(meta_message_id)
  WHERE meta_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS service_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service_category text NOT NULL,
  title text NOT NULL,
  description text,
  price numeric(12, 2),
  currency text NOT NULL DEFAULT 'NGN',
  duration_minutes integer,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_catalog_items_category_check CHECK (
    service_category IN ('salon', 'mechanic', 'tailor')
  ),
  CONSTRAINT service_catalog_items_price_check CHECK (
    price IS NULL OR price >= 0
  ),
  CONSTRAINT service_catalog_items_duration_check CHECK (
    duration_minutes IS NULL OR duration_minutes > 0
  )
);

CREATE INDEX IF NOT EXISTS service_catalog_items_workspace_id_active_sort_order_idx
  ON service_catalog_items(workspace_id, active, sort_order);

CREATE INDEX IF NOT EXISTS service_catalog_items_workspace_id_category_idx
  ON service_catalog_items(workspace_id, service_category);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  service_item_id uuid REFERENCES service_catalog_items(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  whatsapp_source_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_status_check CHECK (
    status IN ('requested', 'scheduled', 'confirmed', 'completed', 'canceled', 'no_show')
  )
);

CREATE INDEX IF NOT EXISTS bookings_workspace_id_scheduled_at_idx
  ON bookings(workspace_id, scheduled_at);

CREATE INDEX IF NOT EXISTS bookings_workspace_id_status_idx
  ON bookings(workspace_id, status);

CREATE INDEX IF NOT EXISTS bookings_lead_id_idx
  ON bookings(lead_id);

CREATE INDEX IF NOT EXISTS bookings_client_id_idx
  ON bookings(client_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  provider text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  payment_link text,
  provider_reference text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  raw_provider_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_check CHECK (amount >= 0),
  CONSTRAINT payments_status_check CHECK (
    status IN ('pending', 'processing', 'paid', 'failed', 'canceled', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS payments_workspace_id_status_idx
  ON payments(workspace_id, status);

CREATE INDEX IF NOT EXISTS payments_workspace_id_created_at_idx
  ON payments(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payments_lead_id_idx
  ON payments(lead_id);

CREATE INDEX IF NOT EXISTS payments_client_id_idx
  ON payments(client_id);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_idx
  ON payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
