-- Create puzzle_scores table
create table if not exists public.puzzle_scores (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  score int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.puzzle_scores is 'Stores the current puzzle score for each user.';

-- Enable RLS
alter table public.puzzle_scores enable row level security;

-- Policies
create policy "Puzzle scores are readable by everyone"
  on public.puzzle_scores for select
  using (true);

-- No direct insert/update policies needed as we use security definer RPC,
-- but good practice to explicit deny or just omit.
-- However, if we want to allow admin to fix scores, we might add policies later.
-- For now, strict RPC only is safer.

-- RPC function to increment score
create or replace function increment_puzzle_score(score_delta int)
returns void
language plpgsql
security definer
as $$
declare
  initial_score int;
begin
  -- Calculate initial score for insert case (cannot be negative)
  initial_score := greatest(0, score_delta);

  insert into public.puzzle_scores (user_id, score)
  values (auth.uid(), initial_score)
  on conflict (user_id) do update
  set score = greatest(0, puzzle_scores.score + score_delta),
      updated_at = now();
end;
$$;
