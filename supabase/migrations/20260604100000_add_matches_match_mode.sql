-- Note for non-coders: this adds the column that the app already sends when saving a match,
-- so the database can understand whether it was singles (1v1) or doubles (2v2).

alter table public.matches
  add column if not exists match_mode text;

update public.matches
set match_mode = case
  when coalesce(array_length(team1, 1), 0) = 1 and coalesce(array_length(team2, 1), 0) = 1 then '1v1'
  else '2v2'
end
where match_mode is null;

alter table public.matches
  alter column match_mode set default '2v2';

alter table public.matches
  alter column match_mode set not null;

do $$
begin
  alter table public.matches
    add constraint matches_match_mode_valid
    check (match_mode in ('1v1', '2v2'));
exception
  when duplicate_object then null;
end $$;

comment on column public.matches.match_mode is
  'Match format used by the clients: 1v1 for singles or 2v2 for doubles.';
