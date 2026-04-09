-- ClientPad Phase 1 foundation schema
create extension if not exists "pgcrypto";

create type workspace_role as enum ('owner', 'admin', 'staff');
create type lead_status as enum ('new', 'contacted', 'qualified', 'unqualified');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  business_type text,
  default_currency text not null default 'NGN',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  position int not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, name),
  unique (workspace_id, position)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  phone text not null,
  source text,
  service_interest text,
  status lead_status not null default 'new',
  owner_user_id uuid references auth.users(id) on delete set null,
  next_follow_up_at timestamptz,
  urgency text,
  budget_clue text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_name text not null,
  primary_contact text,
  phone text,
  email text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  amount numeric(14,2) not null default 0,
  expected_close_date date,
  owner_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  activity_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_leads_workspace_id on public.leads(workspace_id);
create index if not exists idx_clients_workspace_id on public.clients(workspace_id);
create index if not exists idx_deals_workspace_id on public.deals(workspace_id);
create index if not exists idx_activities_workspace_id on public.activities(workspace_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at before update on public.workspaces for each row execute procedure public.set_updated_at();
drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads for each row execute procedure public.set_updated_at();
drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
drop trigger if exists set_deals_updated_at on public.deals;
create trigger set_deals_updated_at before update on public.deals for each row execute procedure public.set_updated_at();

create or replace function public.seed_default_pipeline_stages()
returns trigger
language plpgsql
as $$
begin
  insert into public.pipeline_stages (workspace_id, name, position, is_closed)
  values
    (new.id, 'New', 1, false),
    (new.id, 'Contacted', 2, false),
    (new.id, 'Qualified', 3, false),
    (new.id, 'Quote Sent', 4, false),
    (new.id, 'Negotiation', 5, false),
    (new.id, 'Won', 6, true),
    (new.id, 'Lost', 7, true);

  return new;
end;
$$;

drop trigger if exists seed_default_pipeline_stages_on_workspace on public.workspaces;
create trigger seed_default_pipeline_stages_on_workspace
after insert on public.workspaces
for each row execute procedure public.seed_default_pipeline_stages();

create or replace function public.user_has_workspace_role(target_workspace uuid, allowed_roles workspace_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.clients enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;

create policy "profiles_select_self" on public.profiles
for select to authenticated using (id = auth.uid());
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = auth.uid());

create policy "workspaces_member_select" on public.workspaces
for select to authenticated
using (public.user_has_workspace_role(id, array['owner','admin','staff']::workspace_role[]));

create policy "workspaces_owner_insert" on public.workspaces
for insert to authenticated
with check (created_by = auth.uid());

create policy "workspaces_admin_update" on public.workspaces
for update to authenticated
using (public.user_has_workspace_role(id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(id, array['owner','admin']::workspace_role[]));

create policy "workspace_members_member_select" on public.workspace_members
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "workspace_members_owner_admin_insert" on public.workspace_members
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

create policy "pipeline_stages_member_select" on public.pipeline_stages
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "pipeline_stages_owner_admin_manage" on public.pipeline_stages
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

create policy "leads_member_select" on public.leads
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "leads_member_insert" on public.leads
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "leads_member_update" on public.leads
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "clients_member_select" on public.clients
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "clients_member_insert" on public.clients
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "clients_member_update" on public.clients
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "deals_member_select" on public.deals
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "deals_member_insert" on public.deals
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "deals_member_update" on public.deals
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "activities_member_select" on public.activities
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "activities_member_insert" on public.activities
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
