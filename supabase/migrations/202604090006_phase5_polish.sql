-- Phase 5 polish
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'staff',
  status invite_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email, status)
);

create index if not exists idx_workspace_invites_workspace on public.workspace_invites(workspace_id, created_at desc);
create trigger set_workspace_invites_updated_at before update on public.workspace_invites for each row execute procedure public.set_updated_at();

alter table public.workspace_invites enable row level security;

create policy "workspace_invites_member_select" on public.workspace_invites
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));
create policy "workspace_invites_admin_manage" on public.workspace_invites
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

-- practical indexes for list/filter speed
create index if not exists idx_tasks_workspace_status_due on public.tasks(workspace_id, status, due_at);
create index if not exists idx_jobs_workspace_status_due on public.jobs(workspace_id, status, due_date);
create index if not exists idx_invoices_workspace_status_due on public.invoices(workspace_id, status, due_date);
