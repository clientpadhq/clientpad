create table if not exists public.workspace_branding_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  email text,
  address text,
  website_or_social text,
  logo_url text,
  default_footer_text text,
  default_quote_terms text,
  default_invoice_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_workspace_branding_settings_updated_at on public.workspace_branding_settings;
create trigger set_workspace_branding_settings_updated_at
before update on public.workspace_branding_settings
for each row execute procedure public.set_updated_at();

alter table public.workspace_branding_settings enable row level security;

create policy "workspace_branding_settings_member_select" on public.workspace_branding_settings
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "workspace_branding_settings_admin_manage" on public.workspace_branding_settings
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));
