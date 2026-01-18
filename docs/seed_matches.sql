-- Seed 20–40 random matches with varied dates.
-- If there are no profiles, create a few dummy profiles first.
-- Run in the Supabase SQL editor.

insert into profiles (id, name)
select gen_random_uuid(), unnest(array['Alex', 'Robin', 'Jamie', 'Kim', 'Sam', 'Tess'])
where not exists (select 1 from profiles);

with picks as (
  select
    gs,
    array_agg(p.id) as ids
  from generate_series(1, 30) as gs
  cross join lateral (
    select id
    from profiles
    order by random()
    limit 4
  ) as p
  group by gs
)
insert into matches (
  team1_ids,
  team2_ids,
  team1_sets,
  team2_sets,
  created_by,
  created_at
)
select
  array[ids[1], ids[2]] as team1_ids,
  array[ids[3], ids[4]] as team2_ids,
  (floor(random() * 3) + 6)::int as team1_sets,
  (floor(random() * 3) + 3)::int as team2_sets,
  ids[1] as created_by,
  now() - make_interval(days => (gs * 2)) as created_at
from picks;
