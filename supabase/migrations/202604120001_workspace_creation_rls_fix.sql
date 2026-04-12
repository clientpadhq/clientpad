-- Fix onboarding workspace creation flow under RLS.
-- 1) Allow default pipeline stage trigger to insert rows during workspace creation.
-- 2) Allow the workspace creator to insert their own initial owner membership.

create or replace function public.seed_default_pipeline_stages()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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

drop policy if exists "workspace_members_owner_admin_insert" on public.workspace_members;
create policy "workspace_members_owner_admin_insert" on public.workspace_members
for insert to authenticated
with check (
  (
    user_id = auth.uid()
    and role = 'owner'::workspace_role
    and exists (
      select 1
      from public.workspaces w
      where w.id = workspace_id
        and w.created_by = auth.uid()
    )
  )
  or public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[])
);
