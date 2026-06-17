-- Note for non-coders: this wrapper keeps older apps working by accepting the
-- participant list first, then handing off to the main function safely.
create or replace function public.replace_mexicana_participants(
  new_profile_ids uuid[],
  target_tournament_id uuid
)
returns void
language plpgsql
as $$
begin
  perform public.replace_mexicana_participants(target_tournament_id, new_profile_ids);
end;
$$;

grant execute on function public.replace_mexicana_participants(uuid[], uuid) to authenticated;
