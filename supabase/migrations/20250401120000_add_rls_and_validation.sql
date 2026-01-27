-- Note for non-coders: these rules run on the database so invalid or unauthorized writes are blocked.

alter table if exists profiles enable row level security;
alter table if exists matches enable row level security;
alter table if exists mexicana_tournaments enable row level security;
alter table if exists mexicana_participants enable row level security;
alter table if exists mexicana_rounds enable row level security;
alter table if exists mexicana_results enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select"
  on profiles
  for select
  using (true);

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert"
  on profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update"
  on profiles
  for update
  using (
    auth.uid() = id
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "profiles_delete" on profiles;
create policy "profiles_delete"
  on profiles
  for delete
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "matches_select" on matches;
create policy "matches_select"
  on matches
  for select
  using (true);

drop policy if exists "matches_insert" on matches;
create policy "matches_insert"
  on matches
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "matches_update" on matches;
create policy "matches_update"
  on matches
  for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "matches_delete" on matches;
create policy "matches_delete"
  on matches
  for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "tournaments_select" on mexicana_tournaments;
create policy "tournaments_select"
  on mexicana_tournaments
  for select
  using (true);

drop policy if exists "tournaments_insert" on mexicana_tournaments;
create policy "tournaments_insert"
  on mexicana_tournaments
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "tournaments_update" on mexicana_tournaments;
create policy "tournaments_update"
  on mexicana_tournaments
  for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "tournaments_delete" on mexicana_tournaments;
create policy "tournaments_delete"
  on mexicana_tournaments
  for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "participants_select" on mexicana_participants;
create policy "participants_select"
  on mexicana_participants
  for select
  using (true);

drop policy if exists "participants_insert" on mexicana_participants;
create policy "participants_insert"
  on mexicana_participants
  for insert
  with check (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "participants_update" on mexicana_participants;
create policy "participants_update"
  on mexicana_participants
  for update
  using (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  )
  with check (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "participants_delete" on mexicana_participants;
create policy "participants_delete"
  on mexicana_participants
  for delete
  using (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "rounds_select" on mexicana_rounds;
create policy "rounds_select"
  on mexicana_rounds
  for select
  using (true);

drop policy if exists "rounds_insert" on mexicana_rounds;
create policy "rounds_insert"
  on mexicana_rounds
  for insert
  with check (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "rounds_update" on mexicana_rounds;
create policy "rounds_update"
  on mexicana_rounds
  for update
  using (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  )
  with check (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "rounds_delete" on mexicana_rounds;
create policy "rounds_delete"
  on mexicana_rounds
  for delete
  using (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "results_select" on mexicana_results;
create policy "results_select"
  on mexicana_results
  for select
  using (true);

drop policy if exists "results_insert" on mexicana_results;
create policy "results_insert"
  on mexicana_results
  for insert
  with check (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "results_update" on mexicana_results;
create policy "results_update"
  on mexicana_results
  for update
  using (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  )
  with check (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

drop policy if exists "results_delete" on mexicana_results;
create policy "results_delete"
  on mexicana_results
  for delete
  using (
    exists (
      select 1
      from mexicana_tournaments t
      where t.id = tournament_id
        and (
          t.created_by = auth.uid()
          or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
        )
    )
  );

do $$
begin
  alter table profiles
    add constraint profiles_name_not_empty
    check (char_length(trim(name)) > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table matches
    add constraint matches_team_arrays_length
    check (array_length(team1_ids, 1) = 2 and array_length(team2_ids, 1) = 2);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table matches
    add constraint matches_score_type_valid
    check (score_type is null or score_type in ('sets', 'points'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table matches
    add constraint matches_sets_non_negative
    check (team1_sets >= 0 and team2_sets >= 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table matches
    add constraint matches_score_target_positive
    check (score_target is null or score_target > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table mexicana_tournaments
    add constraint tournaments_status_valid
    check (status in ('draft', 'active', 'completed'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table mexicana_tournaments
    add constraint tournaments_score_target_positive
    check (score_target is null or score_target > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table mexicana_rounds
    add constraint rounds_number_positive
    check (round_number > 0);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table mexicana_rounds
    add constraint rounds_scores_non_negative
    check (
      (team1_score is null or team1_score >= 0)
      and (team2_score is null or team2_score >= 0)
    );
exception
  when duplicate_object then null;
end $$;
