-- Note for non-coders: this table is a shared "settings card" so web and iOS can read/write the same notification choices.

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default jsonb_build_object(
    'enabled', true,
    'eventToggles', jsonb_build_object(
      'scheduled_match_new', true,
      'availability_poll_reminder', true,
      'admin_announcement', true
    ),
    'quietHours', jsonb_build_object(
      'enabled', false,
      'startHour', 22,
      'endHour', 7
    )
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.set_notification_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row
execute function public.set_notification_preferences_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_owner" on public.notification_preferences;
create policy "notification_preferences_select_owner"
  on public.notification_preferences
  for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "notification_preferences_insert_owner" on public.notification_preferences;
create policy "notification_preferences_insert_owner"
  on public.notification_preferences
  for insert
  with check (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "notification_preferences_update_owner" on public.notification_preferences;
create policy "notification_preferences_update_owner"
  on public.notification_preferences
  for update
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "notification_preferences_delete_owner" on public.notification_preferences;
create policy "notification_preferences_delete_owner"
  on public.notification_preferences
  for delete
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );
