-- Note for non-coders: this database function deletes a tournament and its related rows
-- in one go, so the database can roll everything back if any step fails.
create or replace function public.delete_mexicana_tournament(target_tournament_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.mexicana_participants
    where tournament_id = target_tournament_id;

  delete from public.mexicana_rounds
    where tournament_id = target_tournament_id;

  delete from public.mexicana_results
    where tournament_id = target_tournament_id;

  delete from public.mexicana_tournaments
    where id = target_tournament_id;
end;
$$;

grant execute on function public.delete_mexicana_tournament(uuid) to authenticated;
