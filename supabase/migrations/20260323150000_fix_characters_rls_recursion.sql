-- Fix infinite recursion: trade SELECT policy must not query characters under RLS.

create or replace function public.can_view_character_for_trade(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trade_sessions t
    join public.characters mine on mine.user_id = auth.uid()
    where mine.id in (t.initiator_character_id, t.partner_character_id)
      and target_character_id in (t.initiator_character_id, t.partner_character_id)
      and target_character_id <> mine.id
  );
$$;

drop policy if exists "characters_select_trade_counterparty" on public.characters;

create policy "characters_select_trade_counterparty" on public.characters
  for select using (public.can_view_character_for_trade(id));

-- Count existing slots without re-entering characters RLS (before-insert trigger).
create or replace function public.enforce_max_characters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.characters c where c.user_id = new.user_id) >= 3 then
    raise exception 'Maximum of 3 characters per account';
  end if;
  return new;
end;
$$;
