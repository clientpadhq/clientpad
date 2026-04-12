-- Concurrency-safe document numbering per workspace, period, and document type.

create table if not exists public.document_number_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  doc_type text not null check (doc_type in ('quote', 'invoice')),
  period_yyyymm text not null check (period_yyyymm ~ '^[0-9]{6}$'),
  last_value int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, doc_type, period_yyyymm)
);

alter table public.document_number_counters enable row level security;

drop trigger if exists set_document_number_counters_updated_at on public.document_number_counters;
create trigger set_document_number_counters_updated_at
before update on public.document_number_counters
for each row execute procedure public.set_updated_at();

-- Seed counters from existing quote/invoice numbers so switching logic does not regress.
with parsed_quotes as (
  select
    q.workspace_id,
    coalesce(m[1], to_char(coalesce(q.issue_date, q.created_at::date), 'YYYYMM')) as period_yyyymm,
    coalesce((m[2])::int, 0) as seq
  from public.quotes q
  left join lateral regexp_match(q.quote_number, '^Q-(\\d{6})-(\\d+)$') m on true
),
parsed_invoices as (
  select
    i.workspace_id,
    coalesce(m[1], to_char(coalesce(i.issue_date, i.created_at::date), 'YYYYMM')) as period_yyyymm,
    coalesce((m[2])::int, 0) as seq
  from public.invoices i
  left join lateral regexp_match(i.invoice_number, '^INV-(\\d{6})-(\\d+)$') m on true
),
seed_values as (
  select workspace_id, 'quote'::text as doc_type, period_yyyymm, max(seq) as last_value
  from parsed_quotes
  group by workspace_id, period_yyyymm
  union all
  select workspace_id, 'invoice'::text as doc_type, period_yyyymm, max(seq) as last_value
  from parsed_invoices
  group by workspace_id, period_yyyymm
)
insert into public.document_number_counters (workspace_id, doc_type, period_yyyymm, last_value)
select workspace_id, doc_type, period_yyyymm, last_value
from seed_values
on conflict (workspace_id, doc_type, period_yyyymm)
do update
set last_value = greatest(public.document_number_counters.last_value, excluded.last_value),
    updated_at = now();

create or replace function public.next_document_number(
  target_workspace uuid,
  target_doc_type text,
  target_date date default (now() at time zone 'utc')::date
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_doc_type text;
  period text;
  next_value int;
begin
  normalized_doc_type := lower(trim(target_doc_type));

  if normalized_doc_type not in ('quote', 'invoice') then
    raise exception 'Unsupported document type: %', target_doc_type;
  end if;

  period := to_char(coalesce(target_date, (now() at time zone 'utc')::date), 'YYYYMM');

  insert into public.document_number_counters (workspace_id, doc_type, period_yyyymm, last_value)
  values (target_workspace, normalized_doc_type, period, 1)
  on conflict (workspace_id, doc_type, period_yyyymm)
  do update set
    last_value = public.document_number_counters.last_value + 1,
    updated_at = now()
  returning public.document_number_counters.last_value into next_value;

  if normalized_doc_type = 'quote' then
    return 'Q-' || period || '-' || lpad(next_value::text, 4, '0');
  end if;

  return 'INV-' || period || '-' || lpad(next_value::text, 4, '0');
end;
$$;

create or replace function public.next_quote_number(target_workspace uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.next_document_number(target_workspace, 'quote');
end;
$$;

create or replace function public.next_invoice_number(target_workspace uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.next_document_number(target_workspace, 'invoice');
end;
$$;
