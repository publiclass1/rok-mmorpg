-- Weapon & armor dealers + equip item seeds

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata) values
  ('sword', 'Sword', 1, 'weapon', 50, 'weapon', '{}'),
  ('falchion', 'Falchion', 1, 'weapon', 60, 'weapon', '{}'),
  ('blade', 'Blade', 1, 'weapon', 60, 'weapon', '{}'),
  ('rapier', 'Rapier', 1, 'weapon', 55, 'weapon', '{}'),
  ('saber', 'Saber', 1, 'weapon', 90, 'weapon', '{}'),
  ('rod', 'Rod', 1, 'weapon', 40, 'weapon', '{}'),
  ('wand', 'Wand', 1, 'weapon', 40, 'weapon', '{}'),
  ('staff', 'Staff', 1, 'weapon', 90, 'weapon', '{}'),
  ('bow', 'Bow', 1, 'weapon', 50, 'weapon', '{}'),
  ('great_bow', 'Great Bow', 1, 'weapon', 70, 'weapon', '{}'),
  ('composite_bow', 'Composite Bow', 1, 'weapon', 80, 'weapon', '{}'),
  ('mace', 'Mace', 1, 'weapon', 80, 'weapon', '{}'),
  ('club', 'Club', 1, 'weapon', 70, 'weapon', '{}'),
  ('smasher', 'Smasher', 1, 'weapon', 90, 'weapon', '{}'),
  ('axe', 'Axe', 1, 'weapon', 90, 'weapon', '{}'),
  ('battle_axe', 'Battle Axe', 1, 'weapon', 120, 'weapon', '{}'),
  ('main_gauche', 'Main Gauche', 1, 'weapon', 40, 'weapon', '{}'),
  ('dagger', 'Dagger', 1, 'weapon', 40, 'weapon', '{}'),
  ('stiletto', 'Stiletto', 1, 'weapon', 45, 'weapon', '{}'),
  ('adventurers_suit', 'Adventurer''s Suit', 1, 'armor', 10, 'armor', '{}'),
  ('silk_robe', 'Silk Robe', 1, 'armor', 10, 'armor', '{}'),
  ('wooden_mail', 'Wooden Mail', 1, 'armor', 50, 'armor', '{}'),
  ('mantle', 'Mantle', 1, 'armor', 20, 'garment', '{}'),
  ('coat', 'Coat', 1, 'armor', 30, 'armor', '{}'),
  ('buckler', 'Buckler', 1, 'armor', 40, 'offhand', '{}'),
  ('shoes', 'Shoes', 1, 'armor', 20, 'boots', '{}'),
  ('helm', 'Helm', 1, 'armor', 40, 'headTop', '{}')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type,
  weight = excluded.weight,
  equip_slot = excluded.equip_slot;

update public.npc_definitions
set config = jsonb_set(
  coalesce(config, '{}'::jsonb),
  '{stock}',
  '[{"itemId": "red_potion", "price": 50}]'::jsonb
)
where id = 'prontera_tool_dealer';

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values
  (
    'prontera_weapon_dealer',
    'prontera',
    848,
    368,
    'shop',
    'Weapon Dealer',
    '{
      "stock": [
        {"itemId": "knife", "price": 1200},
        {"itemId": "sword", "price": 1600},
        {"itemId": "falchion", "price": 2400},
        {"itemId": "blade", "price": 2900},
        {"itemId": "rapier", "price": 3200},
        {"itemId": "saber", "price": 3500},
        {"itemId": "rod", "price": 1000},
        {"itemId": "wand", "price": 2000},
        {"itemId": "staff", "price": 5000},
        {"itemId": "bow", "price": 2500},
        {"itemId": "great_bow", "price": 8000},
        {"itemId": "composite_bow", "price": 15000},
        {"itemId": "mace", "price": 2400},
        {"itemId": "club", "price": 2900},
        {"itemId": "smasher", "price": 4500},
        {"itemId": "axe", "price": 2800},
        {"itemId": "battle_axe", "price": 5500},
        {"itemId": "main_gauche", "price": 2000},
        {"itemId": "dagger", "price": 2400},
        {"itemId": "stiletto", "price": 3200}
      ]
    }'::jsonb
  ),
  (
    'prontera_armor_dealer',
    'prontera',
    784,
    368,
    'shop',
    'Armor Dealer',
    '{
      "stock": [
        {"itemId": "cotton_shirt", "price": 10},
        {"itemId": "adventurers_suit", "price": 500},
        {"itemId": "silk_robe", "price": 500},
        {"itemId": "wooden_mail", "price": 1200},
        {"itemId": "coat", "price": 2500},
        {"itemId": "cap", "price": 120},
        {"itemId": "goggles", "price": 150},
        {"itemId": "flu_mask", "price": 100},
        {"itemId": "helm", "price": 12000},
        {"itemId": "wooden_shield", "price": 800},
        {"itemId": "buckler", "price": 600},
        {"itemId": "hooded_mantle", "price": 300},
        {"itemId": "mantle", "price": 800},
        {"itemId": "sandals", "price": 150},
        {"itemId": "shoes", "price": 400},
        {"itemId": "clip", "price": 200},
        {"itemId": "glove", "price": 180}
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
