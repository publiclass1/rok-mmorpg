create table if not exists public.dungeon_reward_claims (
  instance_id uuid not null references public.dungeon_instances(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  zeny integer not null,
  base_exp integer not null,
  job_exp integer not null,
  created_at timestamptz not null default now(),
  primary key (instance_id, character_id)
);

alter table public.dungeon_reward_claims enable row level security;
create policy "dungeon_reward_claims_select_own"
  on public.dungeon_reward_claims for select using (
    exists (select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid())
  );

create or replace function public.dungeon_complete(
  p_instance_id uuid,
  p_rewards jsonb,
  p_updates jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  inst public.dungeon_instances;
  item jsonb;
  claim jsonb;
  inserted integer;
  result jsonb := '[]'::jsonb;
begin
  select * into inst from public.dungeon_instances where id = p_instance_id for update;
  if not found then raise exception 'Instance not found'; end if;
  if inst.status <> 'cleared' then
    update public.dungeon_instances set status = 'cleared', mvp_alive = false, updated_at = now()
      where id = p_instance_id;
  end if;

  for item in select * from jsonb_array_elements(p_updates) loop
    insert into public.dungeon_reward_claims(instance_id, character_id, zeny, base_exp, job_exp)
      values (p_instance_id, (item->>'characterId')::uuid,
        (p_rewards->>'zeny')::integer, (p_rewards->>'baseExp')::integer, (p_rewards->>'jobExp')::integer)
      on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
      update public.characters set zeny = zeny + (p_rewards->>'zeny')::integer
        where id = (item->>'characterId')::uuid;
      update public.character_progress set
        base_level = (item->>'baseLevel')::smallint, base_exp = (item->>'baseExp')::integer,
        job_level = (item->>'jobLevel')::smallint, job_exp = (item->>'jobExp')::integer,
        updated_at = now()
        where character_id = (item->>'characterId')::uuid;
      result := result || jsonb_build_array(jsonb_build_object(
        'characterId', item->>'characterId', 'zeny', (p_rewards->>'zeny')::integer,
        'baseExp', (p_rewards->>'baseExp')::integer, 'jobExp', (p_rewards->>'jobExp')::integer));
    end if;
  end loop;
  return result;
end;
$$;


