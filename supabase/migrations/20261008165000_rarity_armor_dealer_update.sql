-- Rarity armor dealer update: add cosmetic variants for armor/garment/shoes/shield/accessories

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata) values
  ('rarity_cos_cotton_shirt', 'Cotton Shirt', 1, 'armor', 10, 'armor', '{}'),
  ('rarity_cos_hooded_mantle', 'Hooded Mantle', 1, 'armor', 10, 'garment', '{}'),
  ('rarity_cos_sandals', 'Sandals', 1, 'armor', 10, 'boots', '{}'),
  ('rarity_cos_wooden_shield', 'Wooden Shield', 1, 'armor', 50, 'offhand', '{}'),
  ('rarity_cos_clip', 'Clip', 1, 'armor', 10, 'accLeft', '{}'),
  ('rarity_cos_glove', 'Glove', 1, 'armor', 10, 'accRight', '{}'),
  ('rarity_cos_adventurers_suit', 'Adventurer''s Suit', 1, 'armor', 10, 'armor', '{}'),
  ('rarity_cos_silk_robe', 'Silk Robe', 1, 'armor', 10, 'armor', '{}'),
  ('rarity_cos_buckler', 'Buckler', 1, 'armor', 40, 'offhand', '{}'),
  ('rarity_cos_shoes', 'Shoes', 1, 'armor', 20, 'boots', '{}'),
  ('rarity_cos_wooden_mail', 'Wooden Mail', 1, 'armor', 50, 'armor', '{}'),
  ('rarity_cos_mantle', 'Mantle', 1, 'armor', 20, 'garment', '{}'),
  ('rarity_cos_coat', 'Coat', 1, 'armor', 30, 'armor', '{}')
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
    {"itemId":"padded_vest","price":100},
    {"itemId":"scout_mail","price":500},
    {"itemId":"knight_plate","price":2000},
    {"itemId":"violet_cuirass","price":8000},
    {"itemId":"dragon_scale_mail","price":25000},
    {"itemId":"skyweave_robe","price":80000},
    {"itemId":"relic_guardplate","price":250000},

    {"itemId":"rarity_cos_cotton_shirt","price":10},
    {"itemId":"rarity_cos_adventurers_suit","price":500},
    {"itemId":"rarity_cos_silk_robe","price":500},
    {"itemId":"rarity_cos_wooden_mail","price":1200},
    {"itemId":"rarity_cos_coat","price":2500},

    {"itemId":"rarity_cos_hooded_mantle","price":300},
    {"itemId":"rarity_cos_mantle","price":800},

    {"itemId":"rarity_cos_sandals","price":150},
    {"itemId":"rarity_cos_shoes","price":400},

    {"itemId":"rarity_cos_wooden_shield","price":800},
    {"itemId":"rarity_cos_buckler","price":600},

    {"itemId":"rarity_cos_clip","price":200},
    {"itemId":"rarity_cos_glove","price":180}
  ]'::jsonb
)
where id = 'prontera_rarity_armor_dealer';

