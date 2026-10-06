-- Prontera 40×28 city layout: NPC positions aligned with content/ro/maps/prontera.layout.json

update public.npc_definitions
set x = 528, y = 464
where id = 'prontera_kafra';

update public.npc_definitions
set x = 624, y = 304
where id = 'prontera_save';

update public.npc_definitions
set x = 720, y = 752
where id = 'prontera_warp';

update public.npc_definitions
set x = 784, y = 528
where id = 'prontera_job_master';

update public.npc_definitions
set x = 816, y = 368
where id = 'prontera_tool_dealer';

update public.npc_definitions
set x = 464, y = 496
where id = 'prontera_healer';

update public.npc_definitions
set config = '{
  "destinations": [
    {"map_id": "prontera", "label": "Prontera", "x": 624, "y": 784}
  ]
}'::jsonb
where id = 'prt_fild01_warp';

-- New characters spawn on the central plaza (existing rows keep saved x/y).
alter table public.characters alter column x set default 656;
alter table public.characters alter column y set default 464;
