-- Culvert farming: etc items + warp to prt_sewb1
insert into public.items (id, name, stack_max, item_type)
values
  ('chrysalis', 'Chrysalis', 99, 'etc'),
  ('worm_peeling', 'Worm Peeling', 99, 'etc'),
  ('sticky_mucus', 'Sticky Mucus', 99, 'etc'),
  ('phracon', 'Phracon', 99, 'etc'),
  ('red_herb', 'Red Herb', 99, 'etc'),
  ('iron_ore', 'Iron Ore', 99, 'etc'),
  ('rat_tail', 'Rat Tail', 99, 'etc'),
  ('animal_skin', 'Animal Skin', 99, 'etc'),
  ('feather', 'Feather', 99, 'etc'),
  ('monsters_feed', 'Monster''s Feed', 99, 'etc'),
  ('tooth_of_bat', 'Tooth of Bat', 99, 'etc'),
  ('grape', 'Grape', 99, 'etc')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type;

update public.npc_definitions
set config = jsonb_set(
  config,
  '{destinations}',
  coalesce(config->'destinations', '[]'::jsonb) || '[
    {"map_id": "prt_sewb1", "label": "Prontera Culvert", "x": 768, "y": 112}
  ]'::jsonb
)
where id = 'prontera_warp';

update public.npc_definitions
set config = jsonb_set(
  config,
  '{buys}',
  coalesce(config->'buys', '[]'::jsonb) || '[
    {"itemId": "chrysalis", "price": 8},
    {"itemId": "worm_peeling", "price": 26},
    {"itemId": "sticky_mucus", "price": 4},
    {"itemId": "phracon", "price": 200},
    {"itemId": "red_herb", "price": 9},
    {"itemId": "iron_ore", "price": 25},
    {"itemId": "rat_tail", "price": 39},
    {"itemId": "animal_skin", "price": 27},
    {"itemId": "feather", "price": 15},
    {"itemId": "monsters_feed", "price": 60},
    {"itemId": "tooth_of_bat", "price": 8},
    {"itemId": "grape", "price": 200}
  ]'::jsonb
)
where id = 'prontera_tool_dealer';
