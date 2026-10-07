-- Party SELECT policies referenced party_members under RLS on party_members (hidden rows).
-- Use security definer helpers, same pattern as can_view_character_for_trade.

create or replace function public.user_owns_character_in_party(p_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.party_members pm
    join public.characters c on c.id = pm.character_id
    where pm.party_id = p_party_id
      and c.user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_character_in_party(uuid) from public;
grant execute on function public.user_owns_character_in_party(uuid) to authenticated;

drop policy if exists "parties_select_member" on public.parties;
create policy "parties_select_member" on public.parties
  for select using (public.user_owns_character_in_party(id));

drop policy if exists "party_members_select_member" on public.party_members;
create policy "party_members_select_member" on public.party_members
  for select using (public.user_owns_character_in_party(party_id));

create or replace function public.user_owns_character_in_guild(p_guild_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guild_members gm
    join public.characters c on c.id = gm.character_id
    where gm.guild_id = p_guild_id
      and c.user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_character_in_guild(uuid) from public;
grant execute on function public.user_owns_character_in_guild(uuid) to authenticated;

drop policy if exists "guilds_select_member" on public.guilds;
create policy "guilds_select_member" on public.guilds
  for select using (public.user_owns_character_in_guild(id));

drop policy if exists "guild_members_select_member" on public.guild_members;
create policy "guild_members_select_member" on public.guild_members
  for select using (public.user_owns_character_in_guild(guild_id));
