-- M2: character progression persistence (progress, skills, equipment)

alter table public.items
  add column if not exists item_type text,
  add column if not exists weight integer,
  add column if not exists equip_slot text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into public.items (id, name, stack_max, item_type, weight, equip_slot, metadata) values
  ('knife', 'Knife', 1, 'weapon', 40, 'weapon', '{}'),
  ('cotton_shirt', 'Cotton Shirt', 1, 'armor', 10, 'armor', '{}'),
  ('cap', 'Cap', 1, 'armor', 10, 'headTop', '{}'),
  ('goggles', 'Goggles', 1, 'armor', 10, 'headMiddle', '{}'),
  ('flu_mask', 'Flu Mask', 1, 'armor', 10, 'headLower', '{}'),
  ('wooden_shield', 'Wooden Shield', 1, 'armor', 10, 'offhand', '{}'),
  ('hooded_mantle', 'Hooded Mantle', 1, 'armor', 10, 'garment', '{}'),
  ('sandals', 'Sandals', 1, 'armor', 10, 'boots', '{}'),
  ('clip', 'Clip', 1, 'armor', 10, 'accLeft', '{}'),
  ('glove', 'Glove', 1, 'armor', 10, 'accRight', '{}')
on conflict (id) do update set
  name = excluded.name,
  stack_max = excluded.stack_max,
  item_type = excluded.item_type,
  weight = excluded.weight,
  equip_slot = excluded.equip_slot;

update public.items set item_type = 'consumable', weight = 7 where id = 'red_potion';
update public.items set item_type = 'etc', weight = 1 where id in ('apple', 'jellopy');

create table public.character_progress (
  character_id uuid primary key references public.characters (id) on delete cascade,
  job_id text not null default 'novice',
  base_level smallint not null default 1 check (base_level >= 1),
  base_exp integer not null default 0 check (base_exp >= 0),
  job_level smallint not null default 1 check (job_level >= 1),
  job_exp integer not null default 0 check (job_exp >= 0),
  str smallint not null default 1 check (str >= 1),
  agi smallint not null default 1 check (agi >= 1),
  vit smallint not null default 1 check (vit >= 1),
  stat_int smallint not null default 1 check (stat_int >= 1),
  dex smallint not null default 1 check (dex >= 1),
  luk smallint not null default 1 check (luk >= 1),
  stat_points_unspent integer not null default 0 check (stat_points_unspent >= 0),
  skill_points_unspent integer not null default 0 check (skill_points_unspent >= 0),
  hp integer check (hp is null or hp >= 0),
  mp integer check (mp is null or mp >= 0),
  skill_bar jsonb not null default '["basic_attack",null,null,null,null,null,null,null,null]'::jsonb,
  session_inventory jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.character_skills (
  character_id uuid not null references public.characters (id) on delete cascade,
  skill_id text not null,
  level smallint not null check (level >= 1),
  primary key (character_id, skill_id)
);

create table public.character_equipment (
  character_id uuid not null references public.characters (id) on delete cascade,
  slot text not null check (
    slot in (
      'weapon', 'headTop', 'headMiddle', 'headLower', 'armor',
      'garment', 'boots', 'offhand', 'accLeft', 'accRight'
    )
  ),
  item_id text not null references public.items (id),
  primary key (character_id, slot)
);

create index character_skills_character_idx on public.character_skills (character_id);
create index character_equipment_character_idx on public.character_equipment (character_id);

alter table public.character_progress enable row level security;
alter table public.character_skills enable row level security;
alter table public.character_equipment enable row level security;

create policy "character_progress_select_own" on public.character_progress
  for select using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_progress_insert_own" on public.character_progress
  for insert with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_progress_update_own" on public.character_progress
  for update using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_skills_select_own" on public.character_skills
  for select using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_skills_insert_own" on public.character_skills
  for insert with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_skills_update_own" on public.character_skills
  for update using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_skills_delete_own" on public.character_skills
  for delete using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_equipment_select_own" on public.character_equipment
  for select using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_equipment_insert_own" on public.character_equipment
  for insert with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_equipment_update_own" on public.character_equipment
  for update using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create policy "character_equipment_delete_own" on public.character_equipment
  for delete using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.user_id = auth.uid()
    )
  );

create or replace function public.grant_initial_character_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.character_progress (
    character_id,
    job_id,
    skill_bar,
    session_inventory,
    hp,
    mp
  )
  values (
    new.id,
    'novice',
    '["basic_attack",null,null,null,null,null,null,null,null]'::jsonb,
    '["knife","cotton_shirt","cap","goggles","flu_mask","wooden_shield","hooded_mantle","sandals","clip","glove"]'::jsonb,
    null,
    null
  )
  on conflict (character_id) do nothing;

  insert into public.character_skills (character_id, skill_id, level)
  values (new.id, 'basic_attack', 1)
  on conflict (character_id, skill_id) do nothing;

  return new;
end;
$$;

create trigger characters_initial_progress
after insert on public.characters
for each row execute function public.grant_initial_character_progress();

-- Backfill existing characters
insert into public.character_progress (
  character_id,
  job_id,
  skill_bar,
  session_inventory,
  hp,
  mp
)
select
  c.id,
  'novice',
  '["basic_attack",null,null,null,null,null,null,null,null]'::jsonb,
  '["knife","cotton_shirt","cap","goggles","flu_mask","wooden_shield","hooded_mantle","sandals","clip","glove"]'::jsonb,
  null,
  null
from public.characters c
on conflict (character_id) do nothing;

insert into public.character_skills (character_id, skill_id, level)
select c.id, 'basic_attack', 1
from public.characters c
on conflict (character_id, skill_id) do nothing;
