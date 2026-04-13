alter table public.workspace_pilot_profiles
  add column if not exists next_follow_up_date date,
  add column if not exists follow_up_focus_note text;
