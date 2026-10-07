-- Allow rental NPC type and add Prontera equipment rental clerk
alter table public.npc_definitions drop constraint if exists npc_definitions_npc_type_check;
alter table public.npc_definitions
  add constraint npc_definitions_npc_type_check
  check (npc_type in ('teleport', 'storage', 'save', 'job_master', 'shop', 'healer', 'dungeon', 'rental'));

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values (
  'prontera_rental',
  'prontera',
  1464,
  1360,
  'rental',
  'Rental Shop',
  '{"facing":"down"}'::jsonb
)
on conflict (id) do update set
  map_id = excluded.map_id,
  x = excluded.x,
  y = excluded.y,
  npc_type = excluded.npc_type,
  label = excluded.label,
  config = excluded.config;
