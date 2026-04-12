-- Restrict owner assignment to current owners only.

drop policy if exists "workspace_members_owner_admin_insert" on public.workspace_members;
create policy "workspace_members_owner_admin_insert" on public.workspace_members
for insert to authenticated
with check (
  public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[])
  and (
    role <> 'owner'::workspace_role
    or public.user_has_workspace_role(workspace_id, array['owner']::workspace_role[])
  )
);

drop policy if exists "workspace_members_owner_admin_update" on public.workspace_members;
create policy "workspace_members_owner_admin_update" on public.workspace_members
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (
  public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[])
  and (
    role <> 'owner'::workspace_role
    or public.user_has_workspace_role(workspace_id, array['owner']::workspace_role[])
  )
);

drop policy if exists "workspace_invites_admin_manage" on public.workspace_invites;
create policy "workspace_invites_admin_manage" on public.workspace_invites
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (
  public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[])
  and (
    role <> 'owner'::workspace_role
    or public.user_has_workspace_role(workspace_id, array['owner']::workspace_role[])
  )
);
