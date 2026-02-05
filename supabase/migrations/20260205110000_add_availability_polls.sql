-- Note for non-coders: this migration adds a weekly availability voting feature.
-- Admins create week polls, players vote on days, and deleting a poll removes all related votes.

create table if not exists public.availability_polls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  week_year integer not null check (week_year >= 2020 and week_year <= 2100),
  week_number integer not null check (week_number >= 1 and week_number <= 53),
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  unique (week_year, week_number),
  check (start_date <= end_date)
);

comment on table public.availability_polls is 'Weekly availability polls created by admins.';
comment on column public.availability_polls.status is 'open = users can vote, closed = voting blocked.';

create table if not exists public.availability_poll_days (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.availability_polls(id) on delete cascade,
  date date not null,
  created_at timestamp with time zone not null default now(),
  unique (poll_id, date)
);

comment on table public.availability_poll_days is 'The 7 dates that belong to each weekly poll.';

create table if not exists public.availability_votes (
  id uuid primary key default gen_random_uuid(),
  poll_day_id uuid not null references public.availability_poll_days(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  slot text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (poll_day_id, profile_id),
  check (slot in ('morning', 'day', 'evening') or slot is null)
);

comment on table public.availability_votes is 'Each user can vote once per day, with optional time-of-day detail.';
comment on column public.availability_votes.slot is 'NULL means full-day availability. morning/day/evening means specific preference.';

create index if not exists availability_polls_status_start_idx
  on public.availability_polls(status, start_date);

create index if not exists availability_poll_days_poll_date_idx
  on public.availability_poll_days(poll_id, date);

create index if not exists availability_votes_day_profile_slot_idx
  on public.availability_votes(poll_day_id, profile_id, slot);

create or replace function public.set_availability_votes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists availability_votes_set_updated_at on public.availability_votes;
create trigger availability_votes_set_updated_at
before update on public.availability_votes
for each row
execute function public.set_availability_votes_updated_at();

alter table public.availability_polls enable row level security;
alter table public.availability_poll_days enable row level security;
alter table public.availability_votes enable row level security;

-- Polls are visible to all signed-in users so everyone can see live results.
drop policy if exists "availability_polls_select" on public.availability_polls;
create policy "availability_polls_select"
  on public.availability_polls
  for select
  using (auth.uid() is not null);

-- Only admins can create, update, or delete polls.
drop policy if exists "availability_polls_insert_admin" on public.availability_polls;
create policy "availability_polls_insert_admin"
  on public.availability_polls
  for insert
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "availability_polls_update_admin" on public.availability_polls;
create policy "availability_polls_update_admin"
  on public.availability_polls
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

drop policy if exists "availability_polls_delete_admin" on public.availability_polls;
create policy "availability_polls_delete_admin"
  on public.availability_polls
  for delete
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Poll days are read by everyone but managed only by admins.
drop policy if exists "availability_poll_days_select" on public.availability_poll_days;
create policy "availability_poll_days_select"
  on public.availability_poll_days
  for select
  using (auth.uid() is not null);

drop policy if exists "availability_poll_days_insert_admin" on public.availability_poll_days;
create policy "availability_poll_days_insert_admin"
  on public.availability_poll_days
  for insert
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "availability_poll_days_update_admin" on public.availability_poll_days;
create policy "availability_poll_days_update_admin"
  on public.availability_poll_days
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

drop policy if exists "availability_poll_days_delete_admin" on public.availability_poll_days;
create policy "availability_poll_days_delete_admin"
  on public.availability_poll_days
  for delete
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Votes are visible to all signed-in users for live collaboration.
drop policy if exists "availability_votes_select" on public.availability_votes;
create policy "availability_votes_select"
  on public.availability_votes
  for select
  using (auth.uid() is not null);

-- Users can insert or update only their own votes, and only while poll is open and still in date range.
drop policy if exists "availability_votes_insert_owner" on public.availability_votes;
create policy "availability_votes_insert_owner"
  on public.availability_votes
  for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.availability_poll_days d
      join public.availability_polls p on p.id = d.poll_id
      where d.id = poll_day_id
        and p.status = 'open'
        and current_date <= p.end_date
    )
  );

drop policy if exists "availability_votes_update_owner" on public.availability_votes;
create policy "availability_votes_update_owner"
  on public.availability_votes
  for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.availability_poll_days d
      join public.availability_polls p on p.id = d.poll_id
      where d.id = poll_day_id
        and p.status = 'open'
        and current_date <= p.end_date
    )
  );

drop policy if exists "availability_votes_delete_owner_or_admin" on public.availability_votes;
create policy "availability_votes_delete_owner_or_admin"
  on public.availability_votes
  for delete
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );
