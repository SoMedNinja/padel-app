alter table mexicana_tournaments
  add column if not exists tournament_type text default 'mexicano';

alter table mexicana_rounds
  add column if not exists mode text default 'mexicano';

-- Update existing tournaments to have type 'mexicano'
update mexicana_tournaments set tournament_type = 'mexicano' where tournament_type is null;
update mexicana_rounds set mode = 'mexicano' where mode is null;
