-- PVP room map NPCs and skull item
insert into public.items (id, name, stack_max, item_type)
values ('skull', 'Skull', 99, 'etc')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type;

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values
  (
    'prontera_pvp_master',
    'prontera',
    1552,
    1648,
    'teleport',
    'PVP Master',
    '{
      "spriteKey": "job_master",
      "facing": "down",
      "destinations": [
        {"map_id": "pvp_room", "label": "PVP Room", "x": 640, "y": 480}
      ]
    }'::jsonb
  ),
  (
    'pvp_room_exit',
    'pvp_room',
    656,
    1152,
    'teleport',
    'PVP Master',
    '{
      "spriteKey": "job_master",
      "facing": "down",
      "destinations": [
        {"map_id": "prontera", "label": "Prontera", "x": 1584, "y": 1616}
      ]
    }'::jsonb
  )
on conflict (id) do update set
  map_id = excluded.map_id,
  x = excluded.x,
  y = excluded.y,
  npc_type = excluded.npc_type,
  label = excluded.label,
  config = excluded.config;
