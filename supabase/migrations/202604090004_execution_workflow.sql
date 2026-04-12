-- Phase 3 execution workflow
create type job_status as enum ('pending', 'scheduled', 'in_progress', 'blocked', 'completed', 'cancelled');
create type task_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type reminder_type as enum ('follow_up_due', 'invoice_overdue', 'job_due', 'custom');
create type reminder_status as enum ('open', 'done', 'dismissed');

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  client_id uuid references public.clients(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  status job_status not null default 'pending',
  priority task_priority not null default 'medium',
  start_date date,
  due_date date,
  completion_note text,
  internal_notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  related_entity_type text,
  related_entity_id uuid,
  assignee_user_id uuid references auth.users(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  snoozed_until timestamptz,
  priority task_priority not null default 'medium',
  status task_status not null default 'open',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type reminder_type not null,
  title text not null,
  description text,
  related_entity_type text,
  related_entity_id uuid,
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  status reminder_status not null default 'open',
  system_generated boolean not null default false,
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, type, related_entity_type, related_entity_id, due_at)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  related_entity_type text not null,
  related_entity_id uuid not null,
  body text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_workspace on public.jobs(workspace_id, created_at desc);
create index if not exists idx_tasks_workspace on public.tasks(workspace_id, created_at desc);
create index if not exists idx_tasks_due on public.tasks(workspace_id, due_at);
create index if not exists idx_reminders_workspace on public.reminders(workspace_id, due_at);

create trigger set_jobs_updated_at before update on public.jobs for each row execute procedure public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
create trigger set_reminders_updated_at before update on public.reminders for each row execute procedure public.set_updated_at();

alter table public.jobs enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.notes enable row level security;

create policy "jobs_member_select" on public.jobs
for select to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "jobs_member_insert" on public.jobs
for insert to authenticated with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "jobs_member_update" on public.jobs
for update to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "tasks_member_select" on public.tasks
for select to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "tasks_member_insert" on public.tasks
for insert to authenticated with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "tasks_member_update" on public.tasks
for update to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "reminders_member_select" on public.reminders
for select to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "reminders_member_insert" on public.reminders
for insert to authenticated with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "reminders_member_update" on public.reminders
for update to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "notes_member_select" on public.notes
for select to authenticated using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "notes_member_insert" on public.notes
for insert to authenticated with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
