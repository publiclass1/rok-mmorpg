-- M4: Job Master NPC type
alter table public.npc_definitions
  drop constraint if exists npc_definitions_npc_type_check;

alter table public.npc_definitions
  add constraint npc_definitions_npc_type_check
  check (npc_type in ('teleport', 'storage', 'save', 'job_master'));

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config)
values (
  'prontera_job_master',
  'prontera',
  400,
  320,
  'job_master',
  'Job Master',
  '{
    "offers": [
      {
        "jobId": "swordman",
        "fromJobId": "novice",
        "requiredJobLevel": 10,
        "requiredBaseLevel": 1,
        "zenyCost": 0
      }
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
