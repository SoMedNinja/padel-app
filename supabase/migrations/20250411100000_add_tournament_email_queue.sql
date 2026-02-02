create table if not exists tournament_email_queue (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references mexicana_tournaments(id) on delete cascade,
  scheduled_for timestamp with time zone not null,
  status text not null default 'pending',
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique (tournament_id)
);

-- Non-coder note: RLS keeps this internal queue hidden from regular app users.
alter table tournament_email_queue enable row level security;

create or replace function schedule_tournament_email() returns trigger as $$
begin
  -- Non-coder note: we only queue an email when a tournament first becomes "completed".
  if (new.status = 'completed') and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    insert into tournament_email_queue (tournament_id, scheduled_for, status)
    values (new.id, now() + interval '2 hours', 'pending')
    on conflict (tournament_id)
    do update set
      scheduled_for = excluded.scheduled_for,
      status = 'pending',
      sent_at = null;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger schedule_tournament_email_after_change
  after insert or update on mexicana_tournaments
  for each row
  execute function schedule_tournament_email();
