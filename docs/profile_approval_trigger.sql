-- Trigger + function to notify users when admin approval changes.
--
-- Prereqs (run once):
--   create extension if not exists pg_net;
--   create extension if not exists supabase_vault;
--
-- Required secrets/settings:
--   select vault.create_secret('profile_approval_webhook_url', 'https://<project>.functions.supabase.co/profile-approval-email');
--   select vault.create_secret('service_role_key', '<SERVICE_ROLE_KEY>');
--   set config vars in edge function: RESEND_API_KEY, RESEND_FROM, APP_BASE_URL, CLUB_NAME

create or replace function public.notify_profile_approval_change()
returns trigger
language plpgsql
security definer
as $$
declare
  webhook_url text;
  service_role_key text;
begin
  if new.is_approved is distinct from old.is_approved then
    webhook_url := vault.get_secret('profile_approval_webhook_url');
    service_role_key := vault.get_secret('service_role_key');

    perform net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'user_id', new.id,
        'is_approved', new.is_approved,
        'profile_name', new.name,
        'club_name', null
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_notify_approval_change on public.profiles;

create trigger profiles_notify_approval_change
after update on public.profiles
for each row
when (old.is_approved is distinct from new.is_approved)
execute function public.notify_profile_approval_change();
