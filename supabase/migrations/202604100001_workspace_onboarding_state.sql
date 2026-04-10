create table if not exists public.workspace_onboarding_state (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  current_step text not null default 'business_profile',
  business_profile_completed boolean not null default false,
  branding_payment_completed boolean not null default false,
  preset_selected boolean not null default false,
  data_import_completed boolean not null default false,
  selected_preset text,
  started_at timestamptz,
  completed_at timestamptz,
  last_skipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workspace_onboarding_state_current_step
  on public.workspace_onboarding_state (current_step);

drop trigger if exists set_workspace_onboarding_state_updated_at on public.workspace_onboarding_state;
create trigger set_workspace_onboarding_state_updated_at
before update on public.workspace_onboarding_state
for each row execute procedure public.set_updated_at();

alter table public.workspace_onboarding_state enable row level security;

drop policy if exists "workspace_onboarding_state_owner_admin_select" on public.workspace_onboarding_state;
create policy "workspace_onboarding_state_owner_admin_select" on public.workspace_onboarding_state
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_onboarding_state_owner_admin_insert" on public.workspace_onboarding_state;
create policy "workspace_onboarding_state_owner_admin_insert" on public.workspace_onboarding_state
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_onboarding_state_owner_admin_update" on public.workspace_onboarding_state;
create policy "workspace_onboarding_state_owner_admin_update" on public.workspace_onboarding_state
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));
