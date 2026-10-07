-- Server-authoritative duel HP (safe if duel_sessions is added before or after anti-cheat migration)

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'duel_sessions'
  ) then
    alter table public.duel_sessions
      add column if not exists challenger_hp integer,
      add column if not exists opponent_hp integer,
      add column if not exists challenger_hp_max integer,
      add column if not exists opponent_hp_max integer,
      add column if not exists last_attack_at timestamptz;
  end if;
end $$;
