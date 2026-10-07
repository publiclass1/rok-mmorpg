-- Spear at Prontera weapon dealer (content already in content/ro/items.json)

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata) values
  ('spear', 'Spear', 1, 'weapon', 70, 'weapon', '{}')
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
  '[
    {"itemId": "knife", "price": 1200},
    {"itemId": "sword", "price": 1600},
    {"itemId": "spear", "price": 1500},
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
  ]'::jsonb
)
where id = 'prontera_weapon_dealer';
