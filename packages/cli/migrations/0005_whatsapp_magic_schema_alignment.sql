-- ClientPad WhatsApp Magic Schema Alignment
-- Unifies WhatsApp, payments, and leads schema for deterministic and AI workflows.

DO $$
BEGIN
  -- 1. Ensure lead_status has 'paid'
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'lead_status'::regtype
      AND enumlabel = 'paid'
  ) THEN
    ALTER TYPE lead_status ADD VALUE 'paid';
  END IF;

  -- 2. Align leads table
  ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS intent text,
    ADD COLUMN IF NOT EXISTS ai_summary text,
    ADD COLUMN IF NOT EXISTS whatsapp_wa_id text;

  -- 3. Align whatsapp_conversations table
  -- Ensure columns from both ai_assistant and workflows migrations exist
  ALTER TABLE whatsapp_conversations
    ADD COLUMN IF NOT EXISTS wa_contact_id text,
    ADD COLUMN IF NOT EXISTS contact_name text,
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

  -- 4. Align payments table
  -- Current payment code expects these columns.
  -- We use ADD COLUMN IF NOT EXISTS to be safe.
  ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider_payment_id text,
    ADD COLUMN IF NOT EXISTS provider_event text,
    ADD COLUMN IF NOT EXISTS webhook_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS service_item_reference text,
    ADD COLUMN IF NOT EXISTS customer_phone text,
    ADD COLUMN IF NOT EXISTS customer_name text,
    ADD COLUMN IF NOT EXISTS payment_url text,
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

  -- Ensure provider and status are compatible if they were created as ENUMs or TEXT
  -- This migration assumes they already exist but might need to be flexible.
END $$;

-- 5. Fix unique constraints if they are missing
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_workspace_wa_contact_idx
  ON whatsapp_conversations(workspace_id, wa_contact_id)
  WHERE wa_contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_idx
  ON payments(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
