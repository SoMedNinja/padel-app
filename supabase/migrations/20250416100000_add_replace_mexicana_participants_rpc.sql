-- Note for non-coders: this database function replaces the roster in one transaction,
-- so we never end up with a half-saved list if something goes wrong mid-update.
create or replace function public.replace_mexicana_participants(
  target_tournament_id uuid,
  new_profile_ids uuid[]
)
returns void
language plpgsql
as $$
begin
  delete from public.mexicana_participants
    where tournament_id = target_tournament_id;

  insert into public.mexicana_participants (tournament_id, profile_id)
  select target_tournament_id, profile_id
  from unnest(new_profile_ids) as profile_id;
end;
$$;

grant execute on function public.replace_mexicana_participants(uuid, uuid[]) to authenticated;
