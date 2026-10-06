-- Browser Ragnarok-like: core schema, RLS, seeds

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  save_map_id text not null default 'prontera',
  save_x double precision not null default 480,
  save_y double precision not null default 360,
  created_at timestamptz not null default now()
);

-- Characters (max 3 slots per user)
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slot smallint not null check (slot between 1 and 3),
  map_id text not null default 'prontera',
  x double precision not null default 480,
  y double precision not null default 360,
  zeny integer not null default 1000 check (zeny >= 0),
  created_at timestamptz not null default now(),
  constraint characters_name_unique unique (name),
  constraint characters_user_slot_unique unique (user_id, slot)
);

create or replace function public.enforce_max_characters()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.characters c where c.user_id = new.user_id) >= 3 then
    raise exception 'Maximum of 3 characters per account';
  end if;
  return new;
end;
$$;

create trigger characters_max_three
before insert on public.characters
for each row execute function public.enforce_max_characters();

-- Item catalog
create table public.items (
  id text primary key,
  name text not null,
  stack_max integer not null default 99 check (stack_max > 0)
);

create table public.account_storage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.items (id),
  quantity integer not null check (quantity > 0),
  constraint account_storage_user_item_unique unique (user_id, item_id)
);

create table public.character_inventory (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id text not null references public.items (id),
  quantity integer not null check (quantity > 0),
  constraint character_inventory_char_item_unique unique (character_id, item_id)
);

create table public.npc_definitions (
  id text primary key,
  map_id text not null,
  x double precision not null,
  y double precision not null,
  npc_type text not null check (npc_type in ('teleport', 'storage', 'save')),
  label text not null,
  config jsonb not null default '{}'::jsonb
);

create table public.trade_sessions (
  id uuid primary key default gen_random_uuid(),
  initiator_character_id uuid not null references public.characters (id) on delete cascade,
  partner_character_id uuid not null references public.characters (id) on delete cascade,
  state text not null check (state in ('pending', 'open', 'locked', 'completed', 'cancelled')),
  initiator_confirmed boolean not null default false,
  partner_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_sessions_distinct_participants check (initiator_character_id <> partner_character_id)
);

create table public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  trade_session_id uuid not null references public.trade_sessions (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id text references public.items (id),
  quantity integer not null default 0 check (quantity >= 0),
  zeny integer not null default 0 check (zeny >= 0),
  constraint trade_offer_has_value check (
    (item_id is not null and quantity > 0) or (zeny > 0)
  )
);

create or replace function public.grant_starter_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.character_inventory (character_id, item_id, quantity)
  values (new.id, 'red_potion', 5)
  on conflict (character_id, item_id) do nothing;
  return new;
end;
$$;

create trigger characters_starter_items
after insert on public.characters
for each row execute function public.grant_starter_items();

create index trade_sessions_participants_idx
  on public.trade_sessions (initiator_character_id, partner_character_id);

create index trade_offers_session_idx on public.trade_offers (trade_session_id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.account_storage enable row level security;
alter table public.character_inventory enable row level security;
alter table public.items enable row level security;
alter table public.npc_definitions enable row level security;
alter table public.trade_sessions enable row level security;
alter table public.trade_offers enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "characters_select_own" on public.characters
  for select using (auth.uid() = user_id);

create policy "characters_insert_own" on public.characters
  for insert with check (auth.uid() = user_id);

create policy "characters_update_own" on public.characters
  for update using (auth.uid() = user_id);

create policy "characters_delete_own" on public.characters
  for delete using (auth.uid() = user_id);

create policy "characters_select_visible_for_trade" on public.characters
  for select using (true);

create policy "account_storage_select_own" on public.account_storage
  for select using (auth.uid() = user_id);

create policy "character_inventory_select_own_char" on public.character_inventory
  for select using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "items_select_all" on public.items for select using (true);
create policy "npc_select_all" on public.npc_definitions for select using (true);

create policy "trade_sessions_select_participant" on public.trade_sessions
  for select using (
    exists (
      select 1 from public.characters c
      where c.user_id = auth.uid()
        and (c.id = initiator_character_id or c.id = partner_character_id)
    )
  );

create policy "trade_offers_select_participant" on public.trade_offers
  for select using (
    exists (
      select 1
      from public.trade_sessions t
      join public.characters c on c.user_id = auth.uid()
      where t.id = trade_session_id
        and (c.id = t.initiator_character_id or c.id = t.partner_character_id)
    )
  );

-- Seeds
insert into public.items (id, name, stack_max) values
  ('red_potion', 'Red Potion', 99),
  ('apple', 'Apple', 99),
  ('jellopy', 'Jellopy', 99);

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config) values
  ('prontera_kafra', 'prontera', 320, 360, 'storage', 'Kafra', '{}'),
  ('prontera_save', 'prontera', 480, 280, 'save', 'Save Point', '{}'),
  ('prontera_warp', 'prontera', 640, 360, 'teleport', 'Warp Agent', '{"destinations":[{"map_id":"field_01","label":"Field 01","x":160,"y":160}]}');

insert into public.npc_definitions (id, map_id, x, y, npc_type, label, config) values
  ('field_kafra', 'field_01', 160, 120, 'storage', 'Field Kafra', '{}'),
  ('field_warp', 'field_01', 480, 320, 'teleport', 'Return Warp', '{"destinations":[{"map_id":"prontera","label":"Prontera","x":640,"y":360}]}');

-- Realtime: trade session updates for participants
alter publication supabase_realtime add table public.trade_sessions;
alter publication supabase_realtime add table public.trade_offers;
