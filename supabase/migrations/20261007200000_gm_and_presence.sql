-- GM flag on characters + online presence heartbeat for admin stats

alter table public.characters
  add column if not exists is_gm boolean not null default false;

create table public.character_presence (
  character_id uuid primary key references public.characters (id) on delete cascade,
  map_id text not null,
  name text not null,
  last_seen timestamptz not null default now()
);

create index character_presence_map_last_seen_idx
  on public.character_presence (map_id, last_seen desc);

alter table public.character_presence enable row level security;

create policy "character_presence_select_own" on public.character_presence
  for select using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_presence_insert_own" on public.character_presence
  for insert with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_presence_update_own" on public.character_presence
  for update using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_presence_delete_own" on public.character_presence
  for delete using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );
