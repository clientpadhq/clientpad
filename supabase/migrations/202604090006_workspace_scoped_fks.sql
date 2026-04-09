-- Phase 6: enforce workspace-scoped relational links

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_workspace_id_id_key' and conrelid = 'public.clients'::regclass) then
    alter table public.clients add constraint clients_workspace_id_id_key unique (workspace_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'deals_workspace_id_id_key' and conrelid = 'public.deals'::regclass) then
    alter table public.deals add constraint deals_workspace_id_id_key unique (workspace_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quotes_workspace_id_id_key' and conrelid = 'public.quotes'::regclass) then
    alter table public.quotes add constraint quotes_workspace_id_id_key unique (workspace_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'invoices_workspace_id_id_key' and conrelid = 'public.invoices'::regclass) then
    alter table public.invoices add constraint invoices_workspace_id_id_key unique (workspace_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'jobs_workspace_id_id_key' and conrelid = 'public.jobs'::regclass) then
    alter table public.jobs add constraint jobs_workspace_id_id_key unique (workspace_id, id);
  end if;
end $$;

-- Backfill/cleanup rows with invalid cross-workspace references
update public.quotes q
set deal_id = null
where deal_id is not null
  and not exists (
    select 1 from public.deals d
    where d.id = q.deal_id and d.workspace_id = q.workspace_id
  );

update public.quotes q
set client_id = null
where client_id is not null
  and not exists (
    select 1 from public.clients c
    where c.id = q.client_id and c.workspace_id = q.workspace_id
  );

delete from public.quote_items qi
where not exists (
  select 1 from public.quotes q
  where q.id = qi.quote_id and q.workspace_id = qi.workspace_id
);

update public.invoices i
set quote_id = null
where quote_id is not null
  and not exists (
    select 1 from public.quotes q
    where q.id = i.quote_id and q.workspace_id = i.workspace_id
  );

update public.invoices i
set deal_id = null
where deal_id is not null
  and not exists (
    select 1 from public.deals d
    where d.id = i.deal_id and d.workspace_id = i.workspace_id
  );

update public.invoices i
set client_id = null
where client_id is not null
  and not exists (
    select 1 from public.clients c
    where c.id = i.client_id and c.workspace_id = i.workspace_id
  );

delete from public.invoice_items ii
where not exists (
  select 1 from public.invoices i
  where i.id = ii.invoice_id and i.workspace_id = ii.workspace_id
);

delete from public.payments p
where not exists (
  select 1 from public.invoices i
  where i.id = p.invoice_id and i.workspace_id = p.workspace_id
);

update public.jobs j
set client_id = null
where client_id is not null
  and not exists (
    select 1 from public.clients c
    where c.id = j.client_id and c.workspace_id = j.workspace_id
  );

update public.jobs j
set deal_id = null
where deal_id is not null
  and not exists (
    select 1 from public.deals d
    where d.id = j.deal_id and d.workspace_id = j.workspace_id
  );

update public.jobs j
set invoice_id = null
where invoice_id is not null
  and not exists (
    select 1 from public.invoices i
    where i.id = j.invoice_id and i.workspace_id = j.workspace_id
  );

-- Replace single-column FKs with workspace-scoped composite FKs
alter table public.quotes drop constraint if exists quotes_deal_id_fkey;
alter table public.quotes drop constraint if exists quotes_client_id_fkey;
alter table public.quote_items drop constraint if exists quote_items_quote_id_fkey;
alter table public.invoices drop constraint if exists invoices_quote_id_fkey;
alter table public.invoices drop constraint if exists invoices_deal_id_fkey;
alter table public.invoices drop constraint if exists invoices_client_id_fkey;
alter table public.invoice_items drop constraint if exists invoice_items_invoice_id_fkey;
alter table public.payments drop constraint if exists payments_invoice_id_fkey;
alter table public.jobs drop constraint if exists jobs_client_id_fkey;
alter table public.jobs drop constraint if exists jobs_deal_id_fkey;
alter table public.jobs drop constraint if exists jobs_invoice_id_fkey;

alter table public.quotes
  add constraint quotes_workspace_deal_fkey
    foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null,
  add constraint quotes_workspace_client_fkey
    foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete set null;

alter table public.quote_items
  add constraint quote_items_workspace_quote_fkey
    foreign key (workspace_id, quote_id) references public.quotes(workspace_id, id) on delete cascade;

alter table public.invoices
  add constraint invoices_workspace_quote_fkey
    foreign key (workspace_id, quote_id) references public.quotes(workspace_id, id) on delete set null,
  add constraint invoices_workspace_deal_fkey
    foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null,
  add constraint invoices_workspace_client_fkey
    foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete set null;

alter table public.invoice_items
  add constraint invoice_items_workspace_invoice_fkey
    foreign key (workspace_id, invoice_id) references public.invoices(workspace_id, id) on delete cascade;

alter table public.payments
  add constraint payments_workspace_invoice_fkey
    foreign key (workspace_id, invoice_id) references public.invoices(workspace_id, id) on delete cascade;

alter table public.jobs
  add constraint jobs_workspace_client_fkey
    foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete set null,
  add constraint jobs_workspace_deal_fkey
    foreign key (workspace_id, deal_id) references public.deals(workspace_id, id) on delete set null,
  add constraint jobs_workspace_invoice_fkey
    foreign key (workspace_id, invoice_id) references public.invoices(workspace_id, id) on delete set null;
