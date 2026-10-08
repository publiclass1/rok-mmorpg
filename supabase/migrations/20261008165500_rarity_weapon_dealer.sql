-- Rarity weapon dealer NPC (cosmetic rarity glow + weapon ATK/M.ATK display)

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata) values
  ('rarity_cos_knife', 'Knife', 1, 'weapon', 40, 'weapon', '{}'),
  ('rarity_cos_sword', 'Sword', 1, 'weapon', 50, 'weapon', '{}'),
  ('rarity_cos_falchion', 'Falchion', 1, 'weapon', 60, 'weapon', '{}'),
  ('rarity_cos_blade', 'Blade', 1, 'weapon', 60, 'weapon', '{}'),
  ('rarity_cos_rapier', 'Rapier', 1, 'weapon', 55, 'weapon', '{}'),
  ('rarity_cos_saber', 'Saber', 1, 'weapon', 90, 'weapon', '{}'),
  ('rarity_cos_spear', 'Spear', 1, 'weapon', 70, 'weapon', '{}'),
  ('rarity_cos_rod', 'Rod', 1, 'weapon', 40, 'weapon', '{}'),
  ('rarity_cos_wand', 'Wand', 1, 'weapon', 40, 'weapon', '{}'),
  ('rarity_cos_staff', 'Staff', 1, 'weapon', 90, 'weapon', '{}'),
  ('rarity_cos_bow', 'Bow', 1, 'weapon', 50, 'weapon', '{}'),
  ('rarity_cos_great_bow', 'Great Bow', 1, 'weapon', 70, 'weapon', '{}'),
  ('rarity_cos_composite_bow', 'Composite Bow', 1, 'weapon', 80, 'weapon', '{}'),
  ('rarity_cos_mace', 'Mace', 1, 'weapon', 80, 'weapon', '{}'),
  ('rarity_cos_club', 'Club', 1, 'weapon', 70, 'weapon', '{}'),
  ('rarity_cos_smasher', 'Smasher', 1, 'weapon', 90, 'weapon', '{}'),
  ('rarity_cos_axe', 'Axe', 1, 'weapon', 90, 'weapon', '{}'),
  ('rarity_cos_battle_axe', 'Battle Axe', 1, 'weapon', 120, 'weapon', '{}'),
  ('rarity_cos_main_gauche', 'Main Gauche', 1, 'weapon', 40, 'weapon', '{}'),
  ('rarity_cos_dagger', 'Dagger', 1, 'weapon', 40, 'weapon', '{}'),
  ('rarity_cos_stiletto', 'Stiletto', 1, 'weapon', 45, 'weapon', '{}')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type,
  weight = excluded.weight,
  equip_slot = excluded.equip_slot;

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values (
  'prontera_rarity_weapon_dealer',
  'prontera',
  1470,
  1030,
  'shop',
  'Rarity Weapon Dealer',
  '{
    "facing": "down",
    "shopLayout": "rarityTabs",
    "stock": [
      {"itemId":"rarity_cos_knife","price":1200},
      {"itemId":"rarity_cos_sword","price":1600},
      {"itemId":"rarity_cos_spear","price":1500},
      {"itemId":"rarity_cos_falchion","price":2400},
      {"itemId":"rarity_cos_blade","price":2900},
      {"itemId":"rarity_cos_rapier","price":3200},
      {"itemId":"rarity_cos_saber","price":3500},
      {"itemId":"rarity_cos_rod","price":1000},
      {"itemId":"rarity_cos_wand","price":2000},
      {"itemId":"rarity_cos_staff","price":5000},
      {"itemId":"rarity_cos_bow","price":2500},
      {"itemId":"rarity_cos_great_bow","price":8000},
      {"itemId":"rarity_cos_composite_bow","price":15000},
      {"itemId":"rarity_cos_mace","price":2400},
      {"itemId":"rarity_cos_club","price":2900},
      {"itemId":"rarity_cos_smasher","price":4500},
      {"itemId":"rarity_cos_axe","price":2800},
      {"itemId":"rarity_cos_battle_axe","price":5500},
      {"itemId":"rarity_cos_main_gauche","price":2000},
      {"itemId":"rarity_cos_dagger","price":2400},
      {"itemId":"rarity_cos_stiletto","price":3200}
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

