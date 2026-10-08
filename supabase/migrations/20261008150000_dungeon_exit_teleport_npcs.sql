-- Dungeon floor exit: NPC teleport (walk-through portal disabled to avoid combat overlap)

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values
  (
    'dun_f1_dun_f1_exit',
    'dun_f1',
    528,
    1232,
    'teleport',
    'Exit to Prontera',
    '{"destinations":[{"map_id":"prontera","label":"Prontera","x":1600,"y":1400}],"facing":"down"}'::jsonb
  ),
  (
    'dun_f2_dun_f2_exit',
    'dun_f2',
    528,
    1232,
    'teleport',
    'Exit to Prontera',
    '{"destinations":[{"map_id":"prontera","label":"Prontera","x":1600,"y":1400}],"facing":"down"}'::jsonb
  ),
  (
    'dun_f3_dun_f3_exit',
    'dun_f3',
    528,
    1232,
    'teleport',
    'Exit to Prontera',
    '{"destinations":[{"map_id":"prontera","label":"Prontera","x":1600,"y":1400}],"facing":"down"}'::jsonb
  ),
  (
    'dun_f4_dun_f4_exit',
    'dun_f4',
    528,
    1232,
    'teleport',
    'Exit to Prontera',
    '{"destinations":[{"map_id":"prontera","label":"Prontera","x":1600,"y":1400}],"facing":"down"}'::jsonb
  ),
  (
    'dun_f5_dun_f5_exit',
    'dun_f5',
    528,
    1232,
    'teleport',
    'Exit to Prontera',
    '{"destinations":[{"map_id":"prontera","label":"Prontera","x":1600,"y":1400}],"facing":"down"}'::jsonb
  )
on conflict (id) do update set
  map_id = excluded.map_id,
  x = excluded.x,
  y = excluded.y,
  npc_type = excluded.npc_type,
  label = excluded.label,
  config = excluded.config;
