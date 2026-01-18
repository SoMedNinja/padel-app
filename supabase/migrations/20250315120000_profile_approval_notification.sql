create extension if not exists pg_net;

create or replace function public.notify_profile_approval_needed()
returns trigger
language plpgsql
security definer
as $$
declare
  function_url text := current_setting('app.settings.profile_approval_function_url', true);
  function_key text := current_setting('app.settings.profile_approval_function_key', true);
  profile_email text;
  payload jsonb;
begin
  if new.is_approved is distinct from false then
    return new;
  end if;

  select email
    into profile_email
    from auth.users
   where id = new.id;

  payload := jsonb_build_object(
    'user_id', new.id,
    'email', profile_email,
    'name', new.name
  );

  if function_url is null or function_key is null then
    raise notice 'Profile approval webhook not configured.';
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', concat('Bearer ', function_key)
    ),
    body := payload
  );

  return new;
end;
$$;

comment on function public.notify_profile_approval_needed() is
  'Notify approval queue via Edge Function. Configure app.settings.profile_approval_function_url and app.settings.profile_approval_function_key.';

drop trigger if exists profile_approval_needed on public.profiles;
create trigger profile_approval_needed
after insert on public.profiles
for each row
execute function public.notify_profile_approval_needed();
