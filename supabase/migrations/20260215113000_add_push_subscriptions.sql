-- Note for non-coders: this table stores each device/browser destination for push notifications.
-- Each row ties one user to one push endpoint (iOS APNs token or web PushSubscription endpoint).

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'web')),
  device_token text not null,
  subscription jsonb,
  user_agent text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone
);

create unique index if not exists push_subscriptions_profile_platform_token_key
  on public.push_subscriptions (profile_id, platform, device_token);

create index if not exists push_subscriptions_platform_last_seen_idx
  on public.push_subscriptions (platform, last_seen_at)
  where revoked_at is null;

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_push_subscriptions_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_owner" on public.push_subscriptions;
create policy "push_subscriptions_select_owner"
  on public.push_subscriptions
  for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "push_subscriptions_insert_owner" on public.push_subscriptions;
create policy "push_subscriptions_insert_owner"
  on public.push_subscriptions
  for insert
  with check (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "push_subscriptions_update_owner" on public.push_subscriptions;
create policy "push_subscriptions_update_owner"
  on public.push_subscriptions
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

drop policy if exists "push_subscriptions_delete_owner" on public.push_subscriptions;
create policy "push_subscriptions_delete_owner"
  on public.push_subscriptions
  for delete
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Note for non-coders: this helper lets clients mark one endpoint as revoked without deleting history.
create or replace function public.revoke_push_subscription(
  p_platform text,
  p_device_token text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update public.push_subscriptions
  set revoked_at = now(),
      last_seen_at = now()
  where profile_id = auth.uid()
    and platform = p_platform
    and device_token = p_device_token
    and revoked_at is null;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

grant execute on function public.revoke_push_subscription(text, text) to authenticated;

-- Note for non-coders: this batch helper disables tokens that have gone silent for too long.
create or replace function public.revoke_stale_push_subscriptions(
  p_max_age_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update public.push_subscriptions
  set revoked_at = now()
  where revoked_at is null
    and last_seen_at < (now() - make_interval(days => greatest(p_max_age_days, 1)));

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

grant execute on function public.revoke_stale_push_subscriptions(integer) to service_role;
