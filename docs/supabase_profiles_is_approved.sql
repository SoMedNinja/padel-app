-- Add approval flag to profiles
alter table public.profiles
  add column if not exists is_approved boolean not null default false;

-- Allow admins to update approval state
-- Assumes profiles.is_admin tracks admin users
drop policy if exists "Admins can update profile approval" on public.profiles;
create policy "Admins can update profile approval"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.profiles as admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles as admin_profile
      where admin_profile.id = auth.uid()
        and admin_profile.is_admin = true
    )
  );

-- Refresh PostgREST schema cache
select pg_notify('pgrst', 'reload schema');
