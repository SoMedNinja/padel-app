-- Store release policy rules per platform so web and iOS can evaluate update-required vs update-recommended.
create table if not exists public.app_version_policies (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  minimum_version text not null,
  latest_version text,
  release_notes text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint app_version_policies_platform_check check (platform in ('web', 'ios')),
  constraint app_version_policies_platform_unique unique (platform)
);

comment on table public.app_version_policies is
  'Single row per platform that defines minimum supported and latest available app versions.';

comment on column public.app_version_policies.minimum_version is
  'If client version is lower than this, UI should force upgrade.';

comment on column public.app_version_policies.latest_version is
  'If client version is lower than this but >= minimum_version, UI should recommend upgrade.';

comment on column public.app_version_policies.release_notes is
  'Optional short text shown to users in upgrade prompt/banner.';

create or replace function public.touch_app_version_policies_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_touch_app_version_policies_updated_at on public.app_version_policies;

create trigger trg_touch_app_version_policies_updated_at
before update on public.app_version_policies
for each row
execute function public.touch_app_version_policies_updated_at();

alter table public.app_version_policies enable row level security;

-- Safe client read access: policy rows are intentionally public metadata.
drop policy if exists "App version policies are readable by clients" on public.app_version_policies;
create policy "App version policies are readable by clients"
on public.app_version_policies
for select
to anon, authenticated
using (true);
