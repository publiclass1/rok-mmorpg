-- Anti-cheat: lock client writes to progression tables, audit log, field kill ledger, duel HP.

-- ---------------------------------------------------------------------------
-- Block direct client mutation of progression (service role / edge functions only)
-- ---------------------------------------------------------------------------
drop policy if exists "character_progress_insert_own" on public.character_progress;
drop policy if exists "character_progress_update_own" on public.character_progress;
drop policy if exists "character_skills_insert_own" on public.character_skills;
drop policy if exists "character_skills_update_own" on public.character_skills;
drop policy if exists "character_skills_delete_own" on public.character_skills;
drop policy if exists "character_equipment_insert_own" on public.character_equipment;
drop policy if exists "character_equipment_update_own" on public.character_equipment;
drop policy if exists "character_equipment_delete_own" on public.character_equipment;

-- ---------------------------------------------------------------------------
-- Characters: authenticated users may only move (x, y, map_id)
-- ---------------------------------------------------------------------------
create or replace function public.guard_characters_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if new.zeny is distinct from old.zeny then
    raise exception 'direct zeny update not allowed';
  end if;

  if new.name is distinct from old.name
     or new.user_id is distinct from old.user_id
     or new.is_gm is distinct from old.is_gm then
    raise exception 'direct character field update not allowed';
  end if;

  if new.x is distinct from old.x
     or new.y is distinct from old.y
     or new.map_id is distinct from old.map_id then
    return new;
  end if;

  raise exception 'character update limited to position and map';
end;
$$;

drop trigger if exists characters_guard_client_update on public.characters;
create trigger characters_guard_client_update
before update on public.characters
for each row execute function public.guard_characters_client_update();

-- ---------------------------------------------------------------------------
-- Audit log (server grants / rejected saves)
-- ---------------------------------------------------------------------------
create table if not exists public.character_audit_log (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists character_audit_log_character_idx
  on public.character_audit_log (character_id, created_at desc);

alter table public.character_audit_log enable row level security;

-- No client policies: admin reads via service role only.

-- ---------------------------------------------------------------------------
-- Field mob kill idempotency (one grant per spawn per respawn window)
-- ---------------------------------------------------------------------------
create table if not exists public.field_spawn_kill_locks (
  map_id text not null,
  spawn_index integer not null,
  locked_until timestamptz not null,
  last_killer_character_id uuid references public.characters (id) on delete set null,
  mob_def_id text not null,
  updated_at timestamptz not null default now(),
  primary key (map_id, spawn_index)
);
