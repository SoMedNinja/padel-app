-- Seed 20–40 random matches with varied dates.
-- Uses existing profiles (requires at least 4 profiles).
-- Run in the Supabase SQL editor.

with picks as (
  select
    gs,
    array_agg(p.id order by p.rn) as ids,
    array_agg(p.name order by p.rn) as names
  from generate_series(1, 30) as gs
  cross join lateral (
    select
      id,
      name,
      row_number() over () as rn
    from profiles
    order by random()
    limit 4
  ) as p
  group by gs
)
insert into matches (
  team1,
  team2,
  team1_ids,
  team2_ids,
  team1_sets,
  team2_sets,
  created_by,
  created_at
)
select
  array[names[1], names[2]] as team1,
  array[names[3], names[4]] as team2,
  array[ids[1], ids[2]] as team1_ids,
  array[ids[3], ids[4]] as team2_ids,
  (floor(random() * 3) + 6)::int as team1_sets,
  (floor(random() * 3) + 3)::int as team2_sets,
  ids[1] as created_by,
  now() - make_interval(days => (gs * 2)) as created_at
from picks;
