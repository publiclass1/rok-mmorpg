-- Rarity armor dealer + cosmetic showcase armor items

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata) values
  ('padded_vest', 'Padded Vest', 1, 'armor', 10, 'armor', '{}'),
  ('scout_mail', 'Scout Mail', 1, 'armor', 15, 'armor', '{}'),
  ('knight_plate', 'Knight Plate', 1, 'armor', 40, 'armor', '{}'),
  ('violet_cuirass', 'Violet Cuirass', 1, 'armor', 50, 'armor', '{}'),
  ('dragon_scale_mail', 'Dragon Scale Mail', 1, 'armor', 60, 'armor', '{}'),
  ('skyweave_robe', 'Skyweave Robe', 1, 'armor', 20, 'armor', '{}'),
  ('relic_guardplate', 'Relic Guardplate', 1, 'armor', 80, 'armor', '{}')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type,
  weight = excluded.weight,
  equip_slot = excluded.equip_slot;

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values (
  'prontera_rarity_armor_dealer',
  'prontera',
  1344,
  1856,
  'shop',
  'Rarity Armor Dealer',
  '{
    "facing": "down",
    "shopLayout": "rarityTabs",
    "stock": [
      {"itemId": "padded_vest", "price": 100},
      {"itemId": "scout_mail", "price": 500},
      {"itemId": "knight_plate", "price": 2000},
      {"itemId": "violet_cuirass", "price": 8000},
      {"itemId": "dragon_scale_mail", "price": 25000},
      {"itemId": "skyweave_robe", "price": 80000},
      {"itemId": "relic_guardplate", "price": 250000}
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
