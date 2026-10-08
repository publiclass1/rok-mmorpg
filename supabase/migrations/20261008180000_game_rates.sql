create table if not exists public.game_settings (
  key text primary key,
  value numeric not null,
  updated_at timestamptz not null default now()
);

insert into public.game_settings (key, value)
values ('exp_rate', 1), ('drop_rate', 1)
on conflict (key) do nothing;

alter table public.game_settings enable row level security;
