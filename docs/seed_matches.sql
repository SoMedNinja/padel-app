-- Seed 20–40 random matches with varied dates.
-- Assumes you already have at least 4 profiles in the profiles table.
-- Run in the Supabase SQL editor.
-- Optional: install functions used by the Admin panel buttons.

create or replace function seed_matches()
returns void
language sql
as $$
  with eligible_profiles as (
    select id
    from profiles
    where is_approved = true
       or is_admin = true
  ),
  picks as (
    select
      gs,
      array_agg(p.id order by random()) as ids
    from generate_series(1, 30) as gs
    cross join lateral (
      select id
      from eligible_profiles
      order by random()
      limit 4
    ) as p
    group by gs
  ),
  match_rules as (
    select
      gs,
      ids,
      rules.format,
      rules.winner,
      rules.swap_teams,
      case
        when rules.format = 'best_of_3' then floor(random() * 2)::int
        else floor(random() * 6)::int
      end as loser_score
    from picks
    cross join lateral (
      select
        case when random() < 0.5 then 'best_of_3' else 'first_to_6' end as format,
        case when random() < 0.5 then 1 else 2 end as winner,
        random() < 0.5 as swap_teams
    ) as rules
  )
  insert into matches (
    team1_ids,
    team2_ids,
    team1,
    team2,
    team1_sets,
    team2_sets,
    created_by,
    created_at
  )
  select
    array[ids[1], ids[2]] as team1_ids,
    array[ids[3], ids[4]] as team2_ids,
    array[
      (select coalesce(name, 'Okänd') from profiles where id = ids[1]),
      (select coalesce(name, 'Okänd') from profiles where id = ids[2])
    ] as team1,
    array[
      (select coalesce(name, 'Okänd') from profiles where id = ids[3]),
      (select coalesce(name, 'Okänd') from profiles where id = ids[4])
    ] as team2,
    case
      when format = 'best_of_3' and winner = 1 then 2
      when format = 'best_of_3' and winner = 2 then loser_score
      when format = 'first_to_6' and winner = 1 then 6
      else loser_score
    end as team1_sets,
    case
      when format = 'best_of_3' and winner = 2 then 2
      when format = 'best_of_3' and winner = 1 then loser_score
      when format = 'first_to_6' and winner = 2 then 6
      else loser_score
    end as team2_sets,
    auth.uid() as created_by,
    now() - make_interval(days => (gs * 2)) as created_at
  from match_rules;
$$;

create or replace function clear_seed_matches()
returns void
language sql
as $$
  delete from matches
  where created_by = auth.uid()
    and created_at >= now() - interval '120 days';
$$;

select seed_matches();
