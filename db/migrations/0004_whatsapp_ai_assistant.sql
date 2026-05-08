-- WhatsApp AI assistant support
-- Stores detected intent, AI summaries, and per-conversation assistant metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS ai_summary text;

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  wa_contact_id text NOT NULL,
  phone text NOT NULL,
  contact_name text,
  last_message_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, wa_contact_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_workspace_id_updated_at_idx
  ON whatsapp_conversations(workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_lead_id_idx
  ON whatsapp_conversations(lead_id);
