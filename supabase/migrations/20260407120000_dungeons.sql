-- Dungeon instances, rolled gear persistence, Dungeon Guide NPC

alter table public.npc_definitions drop constraint if exists npc_definitions_npc_type_check;
alter table public.npc_definitions
  add constraint npc_definitions_npc_type_check
  check (npc_type in ('teleport', 'storage', 'save', 'job_master', 'shop', 'healer', 'dungeon'));

insert into public.items (id, name, stack_max, item_type)
values
  ('decayed_nail', 'Decayed Nail', 99, 'etc'),
  ('skel_bone', 'Skel-Bone', 99, 'etc'),
  ('orcish_voucher', 'Orcish Voucher', 99, 'etc'),
  ('rotten_bandage', 'Rotten Bandage', 99, 'etc'),
  ('glitter_shell', 'Glitter Shell', 99, 'etc'),
  ('heroic_emblem', 'Heroic Emblem', 1, 'etc'),
  ('circlet', 'Circlet', 1, 'armor'),
  ('mask', 'Mask', 1, 'armor'),
  ('ring', 'Ring', 1, 'armor')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type;

alter table public.character_progress
  add column if not exists rolled_items jsonb not null default '{}'::jsonb;

alter table public.character_equipment
  add column if not exists instance_id text null;

create table if not exists public.dungeon_instances (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  floor_id text not null,
  map_id text not null,
  status text not null default 'active' check (status in ('active', 'mvp', 'cleared')),
  killed_spawns integer[] not null default '{}',
  total_spawns integer not null default 0,
  mvp_alive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists dungeon_instances_party_floor_active_idx
  on public.dungeon_instances (party_id, floor_id)
  where status <> 'cleared';

create index if not exists dungeon_instances_party_idx on public.dungeon_instances (party_id);

alter table public.dungeon_instances enable row level security;

create policy "dungeon_instances_select_party"
  on public.dungeon_instances for select
  using (
    exists (
      select 1 from public.party_members pm
      join public.characters c on c.id = pm.character_id
      where pm.party_id = dungeon_instances.party_id
        and c.user_id = auth.uid()
    )
  );

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values (
  'prontera_dungeon_guide',
  'prontera',
  800,
  360,
  'dungeon',
  'Dungeon Guide',
  '{"floors":["dun_f1","dun_f2","dun_f3","dun_f4","dun_f5"]}'::jsonb
)
on conflict (id) do update set
  map_id = excluded.map_id,
  x = excluded.x,
  y = excluded.y,
  npc_type = excluded.npc_type,
  label = excluded.label,
  config = excluded.config;

create or replace function public.dungeon_report_kill(p_instance_id uuid, p_spawn_index integer)
returns public.dungeon_instances
language plpgsql
security definer
set search_path = public
as $$
declare
  inst public.dungeon_instances;
  idx integer;
begin
  select * into inst from public.dungeon_instances where id = p_instance_id for update;
  if not found then
    raise exception 'Instance not found';
  end if;
  if inst.status = 'cleared' then
    return inst;
  end if;
  foreach idx in array inst.killed_spawns loop
    if idx = p_spawn_index then
      return inst;
    end if;
  end loop;
  inst.killed_spawns := array_append(inst.killed_spawns, p_spawn_index);
  if cardinality(inst.killed_spawns) >= inst.total_spawns then
    inst.mvp_alive := true;
    inst.status := 'mvp';
  end if;
  inst.updated_at := now();
  update public.dungeon_instances set
    killed_spawns = inst.killed_spawns,
    mvp_alive = inst.mvp_alive,
    status = inst.status,
    updated_at = inst.updated_at
  where id = p_instance_id;
  return inst;
end;
$$;

alter publication supabase_realtime add table public.dungeon_instances;
