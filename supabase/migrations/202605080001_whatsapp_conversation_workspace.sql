-- WhatsApp conversation workspace
-- Migration 202605080001

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  remote_phone varchar(32) not null,
  display_name text,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  assigned_to uuid references auth.users(id) on delete set null,
  linked_entity_type text check (linked_entity_type in ('lead', 'client', 'deal')),
  linked_entity_id uuid,
  last_message_at timestamptz,
  last_handled_at timestamptz,
  last_read_at timestamptz,
  metadata jsonb default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, remote_phone)
);

create index if not exists idx_whatsapp_conversations_workspace_activity
  on public.whatsapp_conversations(workspace_id, last_message_at desc nulls last, updated_at desc);
create index if not exists idx_whatsapp_conversations_assignment
  on public.whatsapp_conversations(workspace_id, assigned_to, status);
create index if not exists idx_whatsapp_conversations_linked
  on public.whatsapp_conversations(workspace_id, linked_entity_type, linked_entity_id)
  where linked_entity_type is not null;

alter table public.whatsapp_messages add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete set null;
create index if not exists idx_whatsapp_messages_conversation_created
  on public.whatsapp_messages(conversation_id, created_at asc);
create index if not exists idx_whatsapp_messages_workspace_direction_created
  on public.whatsapp_messages(workspace_id, direction, created_at desc);

alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.workspace_whatsapp_config enable row level security;

drop policy if exists "whatsapp_conversations_member_select" on public.whatsapp_conversations;
create policy "whatsapp_conversations_member_select" on public.whatsapp_conversations
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "whatsapp_conversations_member_insert" on public.whatsapp_conversations;
create policy "whatsapp_conversations_member_insert" on public.whatsapp_conversations
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "whatsapp_conversations_member_update" on public.whatsapp_conversations;
create policy "whatsapp_conversations_member_update" on public.whatsapp_conversations
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "whatsapp_messages_member_select" on public.whatsapp_messages;
create policy "whatsapp_messages_member_select" on public.whatsapp_messages
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "whatsapp_messages_member_insert" on public.whatsapp_messages;
create policy "whatsapp_messages_member_insert" on public.whatsapp_messages
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "whatsapp_messages_member_update" on public.whatsapp_messages;
create policy "whatsapp_messages_member_update" on public.whatsapp_messages
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "workspace_whatsapp_config_member_select" on public.workspace_whatsapp_config;
create policy "workspace_whatsapp_config_member_select" on public.workspace_whatsapp_config
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

drop policy if exists "workspace_whatsapp_config_admin_manage" on public.workspace_whatsapp_config;
create policy "workspace_whatsapp_config_admin_manage" on public.workspace_whatsapp_config
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));
