alter table public.profiles
  add column if not exists is_approved boolean not null default false;
