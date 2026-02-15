-- Store globally unique puzzle merits so all users see the same winner across devices.
create table if not exists public.puzzle_unique_merits (
  merit_key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  achieved_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.puzzle_unique_merits is
  'Single owner records for unique puzzle merits (for example first player to solve all scenarios).';

comment on column public.puzzle_unique_merits.merit_key is
  'Stable merit identifier, e.g. padel-quiz-first-perfect.';

alter table public.puzzle_unique_merits enable row level security;

drop policy if exists "Puzzle unique merits are readable by clients" on public.puzzle_unique_merits;
create policy "Puzzle unique merits are readable by clients"
on public.puzzle_unique_merits
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated players can claim puzzle unique merits" on public.puzzle_unique_merits;
create policy "Authenticated players can claim puzzle unique merits"
on public.puzzle_unique_merits
for insert
to authenticated
with check (auth.uid() = user_id);
