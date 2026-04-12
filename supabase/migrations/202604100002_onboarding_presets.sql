alter table public.workspace_payment_settings
  add column if not exists quote_default_terms text,
  add column if not exists invoice_default_terms text,
  add column if not exists task_placeholders jsonb not null default '[]'::jsonb,
  add column if not exists reminder_placeholders jsonb not null default '[]'::jsonb,
  add column if not exists preset_key text,
  add column if not exists preset_applied_at timestamptz;
