-- Blue Potion consumable + Tool Dealer stock

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata)
values ('blue_potion', 'Blue Potion', 99, 'consumable', 7, null, '{}'::jsonb)
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type,
  weight = excluded.weight,
  equip_slot = excluded.equip_slot;

update public.npc_definitions
set config = jsonb_set(
  config,
  '{stock}',
  config->'stock' || '[{"itemId":"blue_potion","price":120}]'::jsonb
)
where id = 'prontera_tool_dealer'
  and not exists (
    select 1
    from jsonb_array_elements(config->'stock') e
    where e->>'itemId' = 'blue_potion'
  );
