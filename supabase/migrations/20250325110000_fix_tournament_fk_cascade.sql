-- Drop the existing foreign key constraint
alter table matches
  drop constraint if exists matches_source_tournament_id_fkey;

-- Re-add it with ON DELETE CASCADE
alter table matches
  add constraint matches_source_tournament_id_fkey
  foreign key (source_tournament_id)
  references mexicana_tournaments(id)
  on delete cascade;
