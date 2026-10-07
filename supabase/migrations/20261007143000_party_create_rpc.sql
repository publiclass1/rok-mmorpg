-- Create party via PostgREST RPC (works when Edge Functions are unreachable from the browser).

create or replace function public.create_party(p_character_id uuid, p_name text)
returns public.parties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_party public.parties;
  v_name text := trim(p_name);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 24 then
    raise exception 'Party name must be 1–24 characters';
  end if;

  if not exists (
    select 1 from public.characters c
    where c.id = p_character_id and c.user_id = v_user_id
  ) then
    raise exception 'Character not found';
  end if;

  if exists (
    select 1 from public.party_members pm where pm.character_id = p_character_id
  ) then
    raise exception 'Already in a party';
  end if;

  insert into public.parties (leader_character_id, name)
  values (p_character_id, v_name)
  returning * into v_party;

  insert into public.party_members (party_id, character_id)
  values (v_party.id, p_character_id);

  return v_party;
end;
$$;

revoke all on function public.create_party(uuid, text) from public;
grant execute on function public.create_party(uuid, text) to authenticated;
