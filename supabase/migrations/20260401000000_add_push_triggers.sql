-- Rename and update the trigger function to be generic
create or replace function public.handle_push_event()
returns trigger
language plpgsql
security definer
as $$
declare
  -- TODO: YOU MUST REPLACE THIS VALUE FOR PUSH NOTIFICATIONS TO WORK
  -- For local development: 'http://host.docker.internal:54321'
  -- For production: 'https://<project-ref>.supabase.co'
  project_url text := 'https://YOUR_PROJECT_REF.supabase.co';

  service_role_key text;
begin
  -- Retrieve the service role key from the vault
  -- Ensure you have added the key to the vault as per docs/weekly_email_setup.md
  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  -- If the key is not found, we cannot send the notification.
  -- You might want to log this or just return early.
  if service_role_key is null then
    return new;
  end if;

  -- Call the Edge Function asynchronously
  perform
    net.http_post(
      url := project_url || '/functions/v1/push-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(new)
      )
    );
  return new;
end;
$$;

-- Drop the old trigger if it exists (renaming function usage)
drop trigger if exists on_match_created on public.matches;

-- Create triggers for relevant tables using the shared function

-- 1. Matches (New match result)
create trigger on_match_created
after insert on public.matches
for each row execute function public.handle_push_event();

-- 2. Availability Polls (New poll created)
drop trigger if exists on_poll_created on public.availability_polls;
create trigger on_poll_created
after insert on public.availability_polls
for each row execute function public.handle_push_event();

-- 3. Scheduled Games (New scheduled match)
drop trigger if exists on_scheduled_game_created on public.availability_scheduled_games;
create trigger on_scheduled_game_created
after insert on public.availability_scheduled_games
for each row execute function public.handle_push_event();
