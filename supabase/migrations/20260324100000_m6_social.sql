-- M6: party, guild, vending

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  leader_character_id uuid not null references public.characters (id) on delete cascade,
  name text not null default 'Party',
  exp_share boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.party_members (
  party_id uuid not null references public.parties (id) on delete cascade,
  character_id uuid primary key references public.characters (id) on delete cascade,
  joined_at timestamptz not null default now()
);

create index party_members_party_idx on public.party_members (party_id);

create table public.party_requests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  from_character_id uuid not null references public.characters (id) on delete cascade,
  to_character_id uuid not null references public.characters (id) on delete cascade,
  kind text not null check (kind in ('invite', 'apply')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint party_requests_distinct check (from_character_id <> to_character_id)
);

create index party_requests_to_pending_idx on public.party_requests (to_character_id, status);

create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  leader_character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint guilds_tag_len check (char_length(tag) >= 2 and char_length(tag) <= 4),
  constraint guilds_tag_unique unique (tag),
  constraint guilds_name_unique unique (name)
);

create table public.guild_members (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  character_id uuid primary key references public.characters (id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now()
);

create index guild_members_guild_idx on public.guild_members (guild_id);

create table public.vendor_stalls (
  character_id uuid primary key references public.characters (id) on delete cascade,
  title text not null default 'Shop',
  map_id text not null,
  x double precision not null default 0,
  y double precision not null default 0,
  is_open boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.vendor_listings (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id text not null references public.items (id),
  price integer not null check (price > 0),
  quantity integer not null check (quantity > 0)
);

create index vendor_listings_character_idx on public.vendor_listings (character_id);
create index vendor_stalls_open_map_idx on public.vendor_stalls (map_id) where is_open;

-- Social character name visibility (security definer, no characters RLS recursion)
create or replace function public.can_view_character_for_social(target_character_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.characters mine
    where mine.user_id = auth.uid()
      and mine.id <> target_character_id
      and (
        exists (
          select 1
          from public.party_members pm_me
          join public.party_members pm_t on pm_t.party_id = pm_me.party_id
          where pm_me.character_id = mine.id and pm_t.character_id = target_character_id
        )
        or exists (
          select 1
          from public.guild_members gm_me
          join public.guild_members gm_t on gm_t.guild_id = gm_me.guild_id
          where gm_me.character_id = mine.id and gm_t.character_id = target_character_id
        )
        or exists (
          select 1
          from public.party_requests pr
          where pr.status = 'pending'
            and (
              (pr.from_character_id = mine.id and pr.to_character_id = target_character_id)
              or (pr.to_character_id = mine.id and pr.from_character_id = target_character_id)
            )
        )
      )
  );
$$;

create policy "characters_select_social" on public.characters
  for select using (public.can_view_character_for_social(id));

alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.party_requests enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.vendor_stalls enable row level security;
alter table public.vendor_listings enable row level security;

create policy "parties_select_member" on public.parties
  for select using (
    exists (
      select 1 from public.party_members pm
      join public.characters c on c.id = pm.character_id
      where pm.party_id = parties.id and c.user_id = auth.uid()
    )
  );

create policy "party_members_select_member" on public.party_members
  for select using (
    exists (
      select 1 from public.party_members pm
      join public.characters c on c.id = pm.character_id
      where pm.party_id = party_members.party_id and c.user_id = auth.uid()
    )
  );

create policy "party_requests_select_involved" on public.party_requests
  for select using (
    exists (
      select 1 from public.characters c
      where c.user_id = auth.uid()
        and (c.id = from_character_id or c.id = to_character_id)
    )
  );

create policy "guilds_select_member" on public.guilds
  for select using (
    exists (
      select 1 from public.guild_members gm
      join public.characters c on c.id = gm.character_id
      where gm.guild_id = guilds.id and c.user_id = auth.uid()
    )
  );

create policy "guild_members_select_member" on public.guild_members
  for select using (
    exists (
      select 1 from public.guild_members gm
      join public.characters c on c.id = gm.character_id
      where gm.guild_id = guild_members.guild_id and c.user_id = auth.uid()
    )
  );

create policy "vendor_stalls_select_open" on public.vendor_stalls
  for select using (is_open = true or exists (
    select 1 from public.characters c where c.id = character_id and c.user_id = auth.uid()
  ));

create policy "vendor_listings_select_open" on public.vendor_listings
  for select using (
    exists (
      select 1 from public.vendor_stalls vs
      where vs.character_id = vendor_listings.character_id and vs.is_open = true
    )
    or exists (
      select 1 from public.characters c where c.id = vendor_listings.character_id and c.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.parties;
alter publication supabase_realtime add table public.party_members;
alter publication supabase_realtime add table public.party_requests;
alter publication supabase_realtime add table public.guilds;
alter publication supabase_realtime add table public.guild_members;
alter publication supabase_realtime add table public.vendor_stalls;
alter publication supabase_realtime add table public.vendor_listings;
