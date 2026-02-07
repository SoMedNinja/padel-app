-- Note for non-coders: this table stores scheduled bookings so invites can show up in the app.

create table if not exists public.availability_scheduled_games (
  id uuid primary key default gen_random_uuid(),
  event_uid text not null,
  poll_id uuid references public.availability_polls(id) on delete set null,
  title text,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  invitee_profile_ids uuid[],
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (event_uid),
  check (start_time < end_time)
);

comment on table public.availability_scheduled_games is 'Scheduled padel bookings created via calendar invites.';
comment on column public.availability_scheduled_games.event_uid is 'Stable calendar UID for updates and cancellations.';

create index if not exists availability_scheduled_games_date_idx
  on public.availability_scheduled_games(date, start_time);

create or replace function public.set_availability_scheduled_games_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists availability_scheduled_games_set_updated_at on public.availability_scheduled_games;
create trigger availability_scheduled_games_set_updated_at
before update on public.availability_scheduled_games
for each row
execute function public.set_availability_scheduled_games_updated_at();

alter table public.availability_scheduled_games enable row level security;

-- Scheduled games are visible to all signed-in users.
drop policy if exists "availability_scheduled_games_select" on public.availability_scheduled_games;
create policy "availability_scheduled_games_select"
  on public.availability_scheduled_games
  for select
  using (auth.uid() is not null);

-- Only admins can create, update, or delete scheduled games.
drop policy if exists "availability_scheduled_games_insert_admin" on public.availability_scheduled_games;
create policy "availability_scheduled_games_insert_admin"
  on public.availability_scheduled_games
  for insert
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "availability_scheduled_games_update_admin" on public.availability_scheduled_games;
create policy "availability_scheduled_games_update_admin"
  on public.availability_scheduled_games
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "availability_scheduled_games_delete_admin" on public.availability_scheduled_games;
create policy "availability_scheduled_games_delete_admin"
  on public.availability_scheduled_games
  for delete
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );
