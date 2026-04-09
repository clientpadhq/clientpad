-- Guard invite acceptance by expiration and speed up pending invite lookups by email.
create index if not exists idx_workspace_invites_email_status_expires_at
on public.workspace_invites(email, status, expires_at);
