-- Relocate Prontera town spawn to central plaza (100x80 map redesign)

update public.npc_definitions
set config = (
  select jsonb_set(
    config,
    '{destinations}',
    coalesce(
      (
        select jsonb_agg(
          case
            when elem->>'map_id' = 'prontera'
            then jsonb_set(jsonb_set(elem, '{x}', '1600'), '{y}', '1400')
            else elem
          end
        )
        from jsonb_array_elements(coalesce(config->'destinations', '[]'::jsonb)) elem
      ),
      '[]'::jsonb
    )
  )
)
where config ? 'destinations'
  and exists (
    select 1
    from jsonb_array_elements(config->'destinations') elem
    where elem->>'map_id' = 'prontera'
  );

update public.profiles
set save_x = 1600, save_y = 1400
where save_map_id = 'prontera';

update public.characters
set x = 1600, y = 1400
where map_id = 'prontera';

alter table public.profiles alter column save_x set default 1600;
alter table public.profiles alter column save_y set default 1400;

alter table public.characters alter column x set default 1600;
alter table public.characters alter column y set default 1400;

delete from public.npc_definitions where id = 'prontera_return_warp';
