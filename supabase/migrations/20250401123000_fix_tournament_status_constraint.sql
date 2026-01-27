-- Note for non-coders: this updates the status rules to match the app's labels.

alter table if exists mexicana_tournaments
  drop constraint if exists tournaments_status_valid;

alter table if exists mexicana_tournaments
  add constraint tournaments_status_valid
  check (status in ('draft', 'in_progress', 'completed', 'abandoned'));
