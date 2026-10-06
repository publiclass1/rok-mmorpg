-- M5: World & NPC services (shop, healer, field map warps)
alter table public.npc_definitions
  drop constraint if exists npc_definitions_npc_type_check;

alter table public.npc_definitions
  add constraint npc_definitions_npc_type_check
  check (npc_type in ('teleport', 'storage', 'save', 'job_master', 'shop', 'healer'));

insert into public.items (id, name, stack_max, item_type)
values ('fluff', 'Fluff', 99, 'etc')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type;

update public.npc_definitions
set config = '{
  "destinations": [
    {"map_id": "prt_fild01", "label": "Prontera Field 01", "x": 480, "y": 320},
    {"map_id": "field_01", "label": "Field (dev)", "x": 160, "y": 160}
  ]
}'::jsonb
where id = 'prontera_warp';

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values
  (
    'prontera_tool_dealer',
    'prontera',
    520,
    300,
    'shop',
    'Tool Dealer',
    '{
      "stock": [
        {"itemId": "red_potion", "price": 50},
        {"itemId": "knife", "price": 1200}
      ],
      "buys": [
        {"itemId": "jellopy", "price": 2},
        {"itemId": "fluff", "price": 3}
      ]
    }'::jsonb
  ),
  (
    'prontera_healer',
    'prontera',
    360,
    400,
    'healer',
    'Healer',
    '{"zenyCost": 0}'::jsonb
  ),
  (
    'prt_fild01_kafra',
    'prt_fild01',
    200,
    140,
    'storage',
    'Kafra',
    '{}'
  ),
  (
    'prt_fild01_warp',
    'prt_fild01',
    460,
    300,
    'teleport',
    'Return Warp',
    '{
      "destinations": [
        {"map_id": "prontera", "label": "Prontera", "x": 640, "y": 360}
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
