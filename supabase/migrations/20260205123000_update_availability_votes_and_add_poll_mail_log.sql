-- Note for non-coders: this migration improves voting and adds email send limits per poll.

alter table public.availability_votes
  add column if not exists slot_preferences text[];

-- Convert old single-slot votes into the new multi-select format.
update public.availability_votes
set slot_preferences = case
  when slot is null then null
  else array[slot]
end
where slot_preferences is null;

alter table public.availability_votes
  drop constraint if exists availability_votes_slot_preferences_valid;

alter table public.availability_votes
  add constraint availability_votes_slot_preferences_valid
  check (
    slot_preferences is null
    or (
      array_length(slot_preferences, 1) >= 1
      and slot_preferences <@ array['morning', 'day', 'evening']::text[]
    )
  );

create table if not exists public.availability_poll_mail_log (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.availability_polls(id) on delete cascade,
  sent_by uuid not null references public.profiles(id) on delete restrict,
  sent_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

comment on table public.availability_poll_mail_log is 'Tracks reminder emails for each poll. Max 2 sends and at least 24h between sends.';

create index if not exists availability_poll_mail_log_poll_sent_idx
  on public.availability_poll_mail_log(poll_id, sent_at desc);

alter table public.availability_poll_mail_log enable row level security;

drop policy if exists "availability_poll_mail_log_select" on public.availability_poll_mail_log;
create policy "availability_poll_mail_log_select"
  on public.availability_poll_mail_log
  for select
  using (auth.uid() is not null);

drop policy if exists "availability_poll_mail_log_insert_admin" on public.availability_poll_mail_log;
create policy "availability_poll_mail_log_insert_admin"
  on public.availability_poll_mail_log
  for insert
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );
