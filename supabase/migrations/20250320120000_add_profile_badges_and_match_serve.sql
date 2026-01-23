alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists featured_badge_id text;

alter table public.matches
  add column if not exists team1_serves_first boolean default true;
