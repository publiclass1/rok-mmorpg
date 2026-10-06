-- Fix: characters_select_visible_for_trade used (true), exposing every character to every user.

drop policy if exists "characters_select_visible_for_trade" on public.characters;

create policy "characters_select_trade_counterparty" on public.characters
  for select using (
    exists (
      select 1
      from public.trade_sessions t
      join public.characters mine on mine.user_id = auth.uid()
      where mine.id in (t.initiator_character_id, t.partner_character_id)
        and characters.id in (t.initiator_character_id, t.partner_character_id)
        and characters.id <> mine.id
    )
  );
