create table if not exists public.workspace_pilot_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  pilot_status text not null default 'onboarding'
    check (pilot_status in ('onboarding', 'active_pilot', 'needs_attention', 'healthy', 'expansion_opportunity', 'at_risk', 'completed')),
  customer_stage text not null default 'trial'
    check (customer_stage in ('trial', 'active_pilot', 'successful_pilot', 'churn_risk', 'case_study_candidate')),
  team_size_estimate int check (team_size_estimate is null or team_size_estimate > 0),
  baseline_process_notes text,
  measurable_outcome_notes text,
  testimonial_quote text,
  permission_to_use_name boolean not null default false,
  permission_to_use_logo boolean not null default false,
  case_study_status text not null default 'not_started'
    check (case_study_status in ('not_started', 'collecting_evidence', 'awaiting_permission', 'ready_to_write', 'published', 'not_applicable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_feedback_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  category text not null
    check (category in ('pain_point', 'missing_feature', 'confusing_workflow', 'bug_report', 'positive_outcome', 'time_saved', 'customer_quote', 'support_note')),
  note_body text not null,
  importance text not null default 'medium'
    check (importance in ('low', 'medium', 'high', 'critical')),
  related_module text,
  status text not null default 'open'
    check (status in ('open', 'planned', 'in_progress', 'monitoring', 'resolved', 'wont_fix')),
  follow_up_date date,
  contact_name text,
  evidence_entity_type text,
  evidence_entity_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_check_in_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  note_date date not null default current_date,
  customer_summary text,
  blockers text,
  wins text,
  requested_changes text,
  next_actions text,
  confidence_level text not null default 'medium'
    check (confidence_level in ('low', 'medium', 'high')),
  evidence_snapshot jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_check_in_feedback_links (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  check_in_note_id uuid not null references public.workspace_check_in_notes(id) on delete cascade,
  feedback_item_id uuid not null references public.workspace_feedback_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (check_in_note_id, feedback_item_id)
);

create index if not exists idx_workspace_feedback_items_workspace_status
  on public.workspace_feedback_items (workspace_id, status, created_at desc);
create index if not exists idx_workspace_feedback_items_workspace_category
  on public.workspace_feedback_items (workspace_id, category, created_at desc);
create index if not exists idx_workspace_check_in_notes_workspace_date
  on public.workspace_check_in_notes (workspace_id, note_date desc, created_at desc);
create index if not exists idx_workspace_check_in_feedback_links_workspace
  on public.workspace_check_in_feedback_links (workspace_id, created_at desc);

drop trigger if exists set_workspace_pilot_profiles_updated_at on public.workspace_pilot_profiles;
create trigger set_workspace_pilot_profiles_updated_at
before update on public.workspace_pilot_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_workspace_feedback_items_updated_at on public.workspace_feedback_items;
create trigger set_workspace_feedback_items_updated_at
before update on public.workspace_feedback_items
for each row execute procedure public.set_updated_at();

drop trigger if exists set_workspace_check_in_notes_updated_at on public.workspace_check_in_notes;
create trigger set_workspace_check_in_notes_updated_at
before update on public.workspace_check_in_notes
for each row execute procedure public.set_updated_at();

insert into public.workspace_pilot_profiles (workspace_id)
select id
from public.workspaces
on conflict (workspace_id) do nothing;

create or replace function public.seed_workspace_pilot_profile()
returns trigger
language plpgsql
as $$
begin
  insert into public.workspace_pilot_profiles (workspace_id)
  values (new.id)
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_workspace_pilot_profile_on_workspace on public.workspaces;
create trigger seed_workspace_pilot_profile_on_workspace
after insert on public.workspaces
for each row execute procedure public.seed_workspace_pilot_profile();

alter table public.workspace_pilot_profiles enable row level security;
alter table public.workspace_feedback_items enable row level security;
alter table public.workspace_check_in_notes enable row level security;
alter table public.workspace_check_in_feedback_links enable row level security;

drop policy if exists "workspace_pilot_profiles_owner_admin_select" on public.workspace_pilot_profiles;
create policy "workspace_pilot_profiles_owner_admin_select" on public.workspace_pilot_profiles
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_pilot_profiles_owner_admin_manage" on public.workspace_pilot_profiles;
create policy "workspace_pilot_profiles_owner_admin_manage" on public.workspace_pilot_profiles
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_feedback_items_owner_admin_select" on public.workspace_feedback_items;
create policy "workspace_feedback_items_owner_admin_select" on public.workspace_feedback_items
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_feedback_items_owner_admin_manage" on public.workspace_feedback_items;
create policy "workspace_feedback_items_owner_admin_manage" on public.workspace_feedback_items
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_check_in_notes_owner_admin_select" on public.workspace_check_in_notes;
create policy "workspace_check_in_notes_owner_admin_select" on public.workspace_check_in_notes
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_check_in_notes_owner_admin_manage" on public.workspace_check_in_notes;
create policy "workspace_check_in_notes_owner_admin_manage" on public.workspace_check_in_notes
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_check_in_feedback_links_owner_admin_select" on public.workspace_check_in_feedback_links;
create policy "workspace_check_in_feedback_links_owner_admin_select" on public.workspace_check_in_feedback_links
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

drop policy if exists "workspace_check_in_feedback_links_owner_admin_manage" on public.workspace_check_in_feedback_links;
create policy "workspace_check_in_feedback_links_owner_admin_manage" on public.workspace_check_in_feedback_links
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));
