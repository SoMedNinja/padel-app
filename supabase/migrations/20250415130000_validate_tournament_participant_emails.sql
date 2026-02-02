create or replace function validate_tournament_participant_emails() returns trigger as $$
declare
  missing_profiles text;
begin
  -- Non-coder note: before we mark a tournament as completed, we confirm every participant can receive emails.
  if (new.status = 'completed') and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    select string_agg(
      coalesce(p.full_name, p.name, mp.profile_id::text, 'Okänd profil'),
      ', '
    )
    into missing_profiles
    from mexicana_participants mp
    left join profiles p on p.id = mp.profile_id
    left join auth.users u on u.id = mp.profile_id
    where mp.tournament_id = new.id
      and (
        mp.profile_id is null
        or nullif(trim(coalesce(u.email, p.email)), '') is null
      );

    if missing_profiles is not null then
      raise exception 'Kan inte slutföra turneringen. Saknar e-post för: %', missing_profiles;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists validate_tournament_participant_emails_before_change on mexicana_tournaments;

create trigger validate_tournament_participant_emails_before_change
  before insert or update on mexicana_tournaments
  for each row
  execute function validate_tournament_participant_emails();
