-- Character appearance (gender + color indices 0–8)

alter table public.characters
  add column if not exists gender text not null default 'male' check (gender in ('male', 'female')),
  add column if not exists body_color smallint not null default 2 check (body_color between 0 and 8),
  add column if not exists hair_color smallint not null default 1 check (hair_color between 0 and 8),
  add column if not exists eye_color smallint not null default 0 check (eye_color between 0 and 8),
  add column if not exists clothes_color smallint not null default 0 check (clothes_color between 0 and 8);
