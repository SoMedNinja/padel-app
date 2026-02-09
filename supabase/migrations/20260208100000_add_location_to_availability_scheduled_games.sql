-- Note for non-coders: this adds a free-text location so calendar invites can share venue details.

alter table public.availability_scheduled_games
  add column if not exists location text;

comment on column public.availability_scheduled_games.location is 'Optional free-text location shown in calendar invites.';
