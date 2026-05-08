-- ClientPad WhatsApp CSV imports
-- Adds lead upsert support by workspace phone and stores imported WhatsApp messages.

CREATE UNIQUE INDEX IF NOT EXISTS leads_workspace_id_phone_key
  ON leads(workspace_id, phone);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  phone text NOT NULL,
  contact_name text,
  source text NOT NULL DEFAULT 'whatsapp_csv',
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_workspace_phone_idx
  ON whatsapp_conversations(workspace_id, phone);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_workspace_last_message_idx
  ON whatsapp_conversations(workspace_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  phone text NOT NULL,
  direction text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_messages_direction_check CHECK (direction IN ('inbound', 'outbound'))
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_sent_at_idx
  ON whatsapp_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_messages_workspace_sent_at_idx
  ON whatsapp_messages(workspace_id, sent_at DESC);
