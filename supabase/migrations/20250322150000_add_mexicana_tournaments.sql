create table if not exists mexicana_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft',
  created_at timestamp with time zone default now(),
  created_by uuid references profiles(id),
  scheduled_at date,
  location text,
  score_target integer default 24,
  notes text,
  completed_at timestamp with time zone,
  synced_to_matches boolean default false
);

create table if not exists mexicana_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references mexicana_tournaments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (tournament_id, profile_id)
);

create table if not exists mexicana_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references mexicana_tournaments(id) on delete cascade,
  round_number integer not null,
  team1_ids uuid[] not null,
  team2_ids uuid[] not null,
  resting_ids uuid[] default '{}',
  team1_score integer,
  team2_score integer,
  created_at timestamp with time zone default now()
);

create index if not exists mexicana_rounds_tournament_round_idx
  on mexicana_rounds (tournament_id, round_number);

create table if not exists mexicana_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references mexicana_tournaments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  rank integer not null,
  points_for integer not null,
  points_against integer not null,
  matches_played integer not null,
  wins integer not null,
  losses integer not null,
  created_at timestamp with time zone default now(),
  unique (tournament_id, profile_id)
);
