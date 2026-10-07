-- Allow client UPDATE on characters when x/y/map_id are unchanged and the row is otherwise identical (idle persist).

create or replace function public.guard_characters_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if new.zeny is distinct from old.zeny then
    raise exception 'direct zeny update not allowed';
  end if;

  if new.name is distinct from old.name
     or new.user_id is distinct from old.user_id
     or new.is_gm is distinct from old.is_gm then
    raise exception 'direct character field update not allowed';
  end if;

  if new.x is distinct from old.x
     or new.y is distinct from old.y
     or new.map_id is distinct from old.map_id then
    return new;
  end if;

  if to_jsonb(new) is not distinct from to_jsonb(old) then
    return new;
  end if;

  raise exception 'character update limited to position and map';
end;
$$;
