-- Phase 2 revenue flow
create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
create type payment_status as enum ('pending', 'successful', 'failed', 'partially_paid', 'manually_recorded');

create table if not exists public.workspace_payment_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  flutterwave_public_key text,
  bank_instruction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quote_number text not null,
  deal_id uuid references public.deals(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  status quote_status not null default 'draft',
  issue_date date not null,
  valid_until date,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  notes text,
  terms text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, quote_number)
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  position int not null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (quote_id, position)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_number text not null,
  quote_id uuid references public.quotes(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  status invoice_status not null default 'draft',
  issue_date date not null,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance_amount numeric(14,2) not null default 0,
  flutterwave_payment_link text,
  flutterwave_tx_ref text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position int not null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (invoice_id, position)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null default 0,
  currency text not null default 'NGN',
  status payment_status not null,
  method text,
  paid_at timestamptz,
  transaction_reference text,
  external_reference text,
  note text,
  source text not null default 'manual',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, external_reference)
);

create index if not exists idx_quotes_workspace on public.quotes(workspace_id, created_at desc);
create index if not exists idx_invoices_workspace on public.invoices(workspace_id, created_at desc);
create index if not exists idx_payments_workspace on public.payments(workspace_id, created_at desc);

create or replace function public.next_quote_number(target_workspace uuid)
returns text
language plpgsql
as $$
declare
  seq int;
begin
  select count(*) + 1 into seq from public.quotes where workspace_id = target_workspace;
  return 'Q-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq::text, 4, '0');
end;
$$;

create or replace function public.next_invoice_number(target_workspace uuid)
returns text
language plpgsql
as $$
declare
  seq int;
begin
  select count(*) + 1 into seq from public.invoices where workspace_id = target_workspace;
  return 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(seq::text, 4, '0');
end;
$$;

drop trigger if exists set_workspace_payment_settings_updated_at on public.workspace_payment_settings;
create trigger set_workspace_payment_settings_updated_at before update on public.workspace_payment_settings for each row execute procedure public.set_updated_at();
drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at before update on public.quotes for each row execute procedure public.set_updated_at();
drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at before update on public.invoices for each row execute procedure public.set_updated_at();

alter table public.workspace_payment_settings enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

create policy "workspace_payment_settings_member_select" on public.workspace_payment_settings
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "workspace_payment_settings_admin_manage" on public.workspace_payment_settings
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin']::workspace_role[]));

create policy "quotes_member_select" on public.quotes
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "quotes_member_insert" on public.quotes
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "quotes_member_update" on public.quotes
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "quote_items_member_select" on public.quote_items
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "quote_items_member_manage" on public.quote_items
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "invoices_member_select" on public.invoices
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "invoices_member_insert" on public.invoices
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "invoices_member_update" on public.invoices
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "invoice_items_member_select" on public.invoice_items
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "invoice_items_member_manage" on public.invoice_items
for all to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));

create policy "payments_member_select" on public.payments
for select to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "payments_member_insert" on public.payments
for insert to authenticated
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
create policy "payments_member_update" on public.payments
for update to authenticated
using (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]))
with check (public.user_has_workspace_role(workspace_id, array['owner','admin','staff']::workspace_role[]));
