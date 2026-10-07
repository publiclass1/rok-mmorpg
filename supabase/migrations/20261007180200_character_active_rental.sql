alter table public.character_progress
  add column if not exists active_rental jsonb;
