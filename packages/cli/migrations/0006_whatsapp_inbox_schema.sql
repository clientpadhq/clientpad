-- ClientPad WhatsApp Inbox Schema
-- Adds support for live inbox operations, delivery tracking, and lead pipeline integration.

DO $$
BEGIN
  -- 1. Ensure whatsapp_conversations has status and delivery tracking
  ALTER TABLE whatsapp_conversations
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz,
    ADD COLUMN IF NOT EXISTS assigned_user_id uuid;

  -- 2. Ensure whatsapp_messages has all inbox columns
  -- Some might exist from workflows migration but we align here for reliability.
  ALTER TABLE whatsapp_messages
    ADD COLUMN IF NOT EXISTS meta_message_id text,
    ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS interactive_payload jsonb,
    ADD COLUMN IF NOT EXISTS media_metadata jsonb,
    ADD COLUMN IF NOT EXISTS location_payload jsonb,
    ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
    ADD COLUMN IF NOT EXISTS read_at timestamptz,
    ADD COLUMN IF NOT EXISTS failed_at timestamptz;

  -- 3. Add lead pipeline stage if missing
  ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS pipeline_stage text;

END $$;

-- 4. Create indices for inbox performance
CREATE INDEX IF NOT EXISTS whatsapp_conversations_workspace_status_idx
  ON whatsapp_conversations(workspace_id, status);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_id_created_at_idx
  ON whatsapp_messages(conversation_id, created_at ASC);
