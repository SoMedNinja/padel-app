alter table mexicana_rounds
add column if not exists completed_at timestamp with time zone;
