-- Sync prontera job master config with content (hunter 2nd job offer)
update public.npc_definitions
set config = jsonb_set(
  config,
  '{offers}',
  (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(coalesce(config->'offers', '[]'::jsonb)) elem
    where elem->>'jobId' is distinct from 'hunter'
  ) || '[
    {"jobId":"hunter","zenyCost":0,"fromJobId":"archer","requiredJobLevel":40,"requiredBaseLevel":40}
  ]'::jsonb
)
where id = 'prontera_job_master';
