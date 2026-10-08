create table if not exists public.field_map_drops (
  id uuid primary key default gen_random_uuid(),
  map_id text not null,
  item_id text not null references public.items (id),
  x real not null,
  y real not null,
  owner_character_id uuid not null references public.characters (id) on delete cascade,
  available_at timestamptz not null,
  expires_at timestamptz not null,
  collected_at timestamptz,
  collected_by_character_id uuid references public.characters (id) on delete set null,
  created_at timestamptz not null default now(),
  check (available_at < expires_at)
);

create index if not exists field_map_drops_map_active_idx
  on public.field_map_drops (map_id, expires_at)
  where collected_at is null;

alter table public.field_map_drops enable row level security;

create or replace function public.pickup_field_map_drop(
  p_drop_id uuid,
  p_character_id uuid,
  p_map_id text,
  p_x real,
  p_y real
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.field_map_drops;
  inv jsonb;
begin
  delete from public.field_map_drops where collected_at is null and expires_at <= now();
  select * into d from public.field_map_drops where id = p_drop_id for update;
  if not found or d.collected_at is not null then
    raise exception 'Drop already collected or missing' using errcode = 'P0001';
  end if;
  if d.expires_at <= now() then
    delete from public.field_map_drops where id = d.id;
    raise exception 'Drop expired' using errcode = 'P0001';
  end if;
  if d.map_id <> p_map_id then raise exception 'Invalid drop location' using errcode = 'P0001'; end if;
  if sqrt(power(d.x - p_x, 2) + power(d.y - p_y, 2)) > 32 then
    raise exception 'Too far from drop' using errcode = 'P0001';
  end if;
  if d.available_at > now() and d.owner_character_id <> p_character_id then
    raise exception 'Drop is reserved for its owner' using errcode = 'P0001';
  end if;

  select session_inventory into inv
  from public.character_progress
  where character_id = p_character_id
  for update;
  if not found then raise exception 'Progress not found' using errcode = 'P0001'; end if;
  inv := coalesce(inv, '[]'::jsonb) || jsonb_build_array(d.item_id);
  update public.character_progress
  set session_inventory = inv, updated_at = now()
  where character_id = p_character_id;
  update public.field_map_drops
  set collected_at = now(), collected_by_character_id = p_character_id
  where id = d.id;
  return jsonb_build_object('dropId', d.id, 'itemId', d.item_id, 'sessionInventory', inv);
end;
$$;
