-- WhatsApp Business API integration
-- Migration 202605010001

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WhatsApp messages table
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(255) UNIQUE,
    from_phone VARCHAR(20) NOT NULL,
    to_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'template', 'image', 'document', 'audio')),
    content TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'pending')),
    whatsapp_wid VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    linked_entity_type VARCHAR(50),
    linked_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- Index for workspace queries
CREATE INDEX idx_whatsapp_messages_workspace ON whatsapp_messages(workspace_id, created_at DESC);

-- Index for linked entity queries
CREATE INDEX idx_whatsapp_messages_linked ON whatsapp_messages(linked_entity_type, linked_entity_id) WHERE linked_entity_type IS NOT NULL;

-- Index for phone lookups
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(to_phone);

-- Workspace WhatsApp configuration
CREATE TABLE workspace_whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
    phone_number_id VARCHAR(255),
    business_account_id VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT false,
    default_template_language VARCHAR(10) DEFAULT 'en_US',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity types for WhatsApp interactions
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'whatsapp.message_sent';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'whatsapp.message_delivered';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'whatsapp.message_read';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'whatsapp.message_failed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'whatsapp.message_received';

-- Add workspace WhatsApp settings to workspaces table (optional quick config)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;