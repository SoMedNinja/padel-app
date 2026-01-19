-- Migrate staged match data into matches with name normalization + profile ID mapping.
-- Assumes staging_matches has: played_at timestamptz, team1 jsonb, team2 jsonb,
-- team1_sets int, team2_sets int.
-- Updates created_at to played_at and sets created_by to a constant UUID.

WITH name_map(old_name, new_name) AS (
  VALUES
    ('Parth', 'Parth "get" Mody'),
    ('Deniz', 'DeNo^'),
    ('Svag Rojan', 'Rojan_old_data'),
    ('Rustam', 'Rustam'),
    ('Robert', 'Robert'),
    ('Gäst', 'Gäst')
),
cleaned AS (
  SELECT
    played_at,
    ARRAY(
      SELECT COALESCE(nm.new_name, cleaned.name)
      FROM (
        SELECT replace(replace(p, '“','"'), '”','"') AS name,
               ord
        FROM jsonb_array_elements_text(team1) WITH ORDINALITY AS t(p, ord)
      ) AS cleaned
      LEFT JOIN name_map nm ON nm.old_name = cleaned.name
      ORDER BY cleaned.ord
    ) AS team1_names,
    ARRAY(
      SELECT COALESCE(nm.new_name, cleaned.name)
      FROM (
        SELECT replace(replace(p, '“','"'), '”','"') AS name,
               ord
        FROM jsonb_array_elements_text(team2) WITH ORDINALITY AS t(p, ord)
      ) AS cleaned
      LEFT JOIN name_map nm ON nm.old_name = cleaned.name
      ORDER BY cleaned.ord
    ) AS team2_names,
    team1_sets,
    team2_sets
  FROM staging_matches
),
profile_map AS (
  SELECT
    lower(trim(replace(replace(name, '“','"'), '”','"'))) AS name_key,
    id
  FROM profiles
),
resolved AS (
  SELECT
    played_at,
    team1_names,
    team2_names,
    ARRAY(
      SELECT pm.id
      FROM unnest(team1_names) WITH ORDINALITY AS t(name, ord)
      LEFT JOIN profile_map pm ON pm.name_key = lower(trim(replace(replace(t.name, '“','"'), '”','"')))
      ORDER BY ord
    ) AS team1_ids,
    ARRAY(
      SELECT pm.id
      FROM unnest(team2_names) WITH ORDINALITY AS t(name, ord)
      LEFT JOIN profile_map pm ON pm.name_key = lower(trim(replace(replace(t.name, '“','"'), '”','"')))
      ORDER BY ord
    ) AS team2_ids,
    team1_sets,
    team2_sets
  FROM cleaned
)
INSERT INTO matches (
  created_at,
  team1,
  team2,
  team1_ids,
  team2_ids,
  team1_sets,
  team2_sets,
  created_by
)
SELECT
  played_at,
  team1_names,
  team2_names,
  team1_ids,
  team2_ids,
  team1_sets,
  team2_sets,
  'cf614f82-231c-4aa1-ab5c-5aeff597da9f'::uuid
FROM resolved;
