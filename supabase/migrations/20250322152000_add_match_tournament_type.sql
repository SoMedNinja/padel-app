alter table matches
  add column if not exists source_tournament_type text;

update matches
set source_tournament_type = case
  when source_tournament_id is null then 'standalone'
  else 'mexicana'
end
where source_tournament_type is null;
