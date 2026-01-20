alter table public.profiles
  add column if not exists is_deleted boolean not null default false;
