-- Pipeline stage soft-archive and color support
alter table public.pipeline_stages
  add column if not exists is_active boolean not null default true,
  add column if not exists color text;

alter table public.pipeline_stages
  drop constraint if exists pipeline_stages_workspace_id_name_key,
  drop constraint if exists pipeline_stages_workspace_id_position_key;

create unique index if not exists uq_pipeline_stage_active_name
  on public.pipeline_stages (workspace_id, lower(name))
  where is_active = true;

create unique index if not exists uq_pipeline_stage_active_position
  on public.pipeline_stages (workspace_id, position)
  where is_active = true;

create index if not exists idx_pipeline_stages_workspace_active_position
  on public.pipeline_stages (workspace_id, is_active, position);
