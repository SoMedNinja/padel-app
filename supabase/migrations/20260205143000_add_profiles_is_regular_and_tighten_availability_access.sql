-- Note for non-coders: this adds the "regular player" switch used to control Schema access and poll emails.

alter table public.profiles
  add column if not exists is_regular boolean not null default true;

comment on column public.profiles.is_regular is 'True = regular player (ordinarie) who can access weekly Schema and receive Schema emails.';

-- Make availability reads/votes available only to regular players (or admins for management).
drop policy if exists "availability_polls_select" on public.availability_polls;
create policy "availability_polls_select"
  on public.availability_polls
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.is_regular = true or p.is_admin = true)
    )
  );

drop policy if exists "availability_poll_days_select" on public.availability_poll_days;
create policy "availability_poll_days_select"
  on public.availability_poll_days
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.is_regular = true or p.is_admin = true)
    )
  );

drop policy if exists "availability_votes_select" on public.availability_votes;
create policy "availability_votes_select"
  on public.availability_votes
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.is_regular = true or p.is_admin = true)
    )
  );

drop policy if exists "availability_votes_insert_owner" on public.availability_votes;
create policy "availability_votes_insert_owner"
  on public.availability_votes
  for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_regular = true
    )
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
      from public.profiles p
      where p.id = auth.uid()
        and p.is_regular = true
    )
    and exists (
      select 1
      from public.availability_poll_days d
      join public.availability_polls p on p.id = d.poll_id
      where d.id = poll_day_id
        and p.status = 'open'
        and current_date <= p.end_date
    )
  );
