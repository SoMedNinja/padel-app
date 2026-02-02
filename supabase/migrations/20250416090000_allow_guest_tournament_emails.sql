create or replace function validate_tournament_participant_emails() returns trigger as $$
declare
  missing_profiles text;
begin
  -- Non-coder note: we still check for missing emails, but we skip guest slots (null profile_id).
  if (new.status = 'completed') and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    select string_agg(
      -- Note for non-coders: the profiles table stores the display name in "name",
      -- so we only reference that column to avoid missing-column errors.
      coalesce(p.name, mp.profile_id::text, 'Okänd profil'),
      ', '
    )
    into missing_profiles
    from mexicana_participants mp
    left join profiles p on p.id = mp.profile_id
    left join auth.users u on u.id = mp.profile_id
    where mp.tournament_id = new.id
      and mp.profile_id is not null
      and nullif(trim(coalesce(u.email, p.email)), '') is null;

    if missing_profiles is not null then
      raise exception 'Kan inte slutföra turneringen. Saknar e-post för: %', missing_profiles;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;
