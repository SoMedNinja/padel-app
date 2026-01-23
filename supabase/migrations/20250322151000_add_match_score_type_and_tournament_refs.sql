alter table matches
  add column if not exists score_type text,
  add column if not exists score_target integer,
  add column if not exists source_tournament_id uuid references mexicana_tournaments(id);

update matches set score_type = 'sets' where score_type is null;
