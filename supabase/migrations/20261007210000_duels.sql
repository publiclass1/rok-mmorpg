-- Player duels: invite, countdown, PvP session metadata

create table public.duel_sessions (
  id uuid primary key default gen_random_uuid(),
  challenger_character_id uuid not null references public.characters (id) on delete cascade,
  opponent_character_id uuid not null references public.characters (id) on delete cascade,
  state text not null default 'pending' check (
    state in ('pending', 'countdown', 'active', 'completed', 'declined', 'cancelled')
  ),
  map_id text not null,
  fight_starts_at timestamptz,
  challenger_name text not null,
  challenger_job_id text not null,
  challenger_base_level smallint not null check (challenger_base_level >= 1),
  challenger_snapshot jsonb,
  opponent_snapshot jsonb,
  challenger_hp integer,
  opponent_hp integer,
  challenger_hp_max integer,
  opponent_hp_max integer,
  last_attack_at timestamptz,
  winner_character_id uuid references public.characters (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duel_sessions_distinct check (challenger_character_id <> opponent_character_id)
);

create index duel_sessions_opponent_pending_idx
  on public.duel_sessions (opponent_character_id, state)
  where state = 'pending';

create index duel_sessions_participants_active_idx
  on public.duel_sessions (challenger_character_id, opponent_character_id, state)
  where state in ('pending', 'countdown', 'active');

alter table public.duel_sessions enable row level security;

create policy "duel_sessions_select_participant" on public.duel_sessions
  for select using (
    exists (
      select 1 from public.characters c
      where c.user_id = auth.uid()
        and (c.id = challenger_character_id or c.id = opponent_character_id)
    )
  );

alter publication supabase_realtime add table public.duel_sessions;
