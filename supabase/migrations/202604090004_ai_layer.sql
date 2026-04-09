-- Phase 4 AI layer
create type ai_generation_type as enum (
  'lead_summary',
  'follow_up_draft',
  'quote_text_draft',
  'payment_reminder_draft',
  'weekly_digest',
  'next_step_suggestion'
);
create type ai_generation_status as enum ('success', 'error', 'unavailable');

create table if not exists public.workspace_ai_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  ai_enabled boolean not null default true,
  default_provider text not null default 'mistral',
  default_model text,
  monthly_cap int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  generation_type ai_generation_type not null,
  provider text,
  model text,
  prompt_version text,
  prompt_input_summary jsonb,
  output_text text,
  structured_output_json jsonb,
  status ai_generation_status not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_generations_workspace on public.ai_generations(workspace_id, created_at desc);
create index if not exists idx_ai_generations_entity on public.ai_generations(workspace_id, entity_type, entity_id, created_at desc);

create trigger set_workspace_ai_settings_updated_at before update on public.workspace_ai_settings for each row execute procedure public.set_updated_at();

alter table public.workspace_ai_settings enable row level security;
alter table public.ai_generations enable row level security;

create policy "workspace_ai_settings_member_select" on public.workspace_ai_settings
for select to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "workspace_ai_settings_admin_manage" on public.workspace_ai_settings
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

create policy "ai_generations_member_select" on public.ai_generations
for select to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "ai_generations_member_insert" on public.ai_generations
for insert to authenticated with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
