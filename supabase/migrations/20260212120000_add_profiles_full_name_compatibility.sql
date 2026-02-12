-- Note for non-coders: some older app builds still ask the database for "full_name".
-- We keep this compatibility column synced with "name" so both old and new builds work.
alter table public.profiles
  add column if not exists full_name text;

update public.profiles
set full_name = name
where full_name is distinct from name;

create or replace function public.sync_profiles_name_and_full_name()
returns trigger
language plpgsql
as $$
begin
  -- Note for non-coders: if one name field is sent, copy it into the other field.
  if new.name is null and new.full_name is not null then
    new.name := new.full_name;
  end if;

  if new.full_name is null and new.name is not null then
    new.full_name := new.name;
  end if;

  if new.name is not null and new.full_name is not null and new.name is distinct from new.full_name then
    -- Note for non-coders: "name" is our primary app field, so it wins when both differ.
    new.full_name := new.name;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profiles_name_and_full_name on public.profiles;

create trigger trg_sync_profiles_name_and_full_name
before insert or update on public.profiles
for each row
execute function public.sync_profiles_name_and_full_name();
