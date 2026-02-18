-- Enable required extensions
create extension if not exists supabase_vault;
create extension if not exists pg_net;

-- Rename and update the trigger function to be generic
create or replace function public.handle_push_event()
returns trigger
language plpgsql
security definer
as $$
declare
  -- Retrieve project URL and Service Role Key from Vault
  -- You must set these secrets in your Supabase project using:
  -- select vault.create_secret('https://<project-ref>.supabase.co', 'supabase_project_url');
  -- select vault.create_secret('<your-service-role-key>', 'service_role_key');

  project_url text := (
    select decrypted_secret from vault.decrypted_secrets where name = 'supabase_project_url' limit 1
  );

  service_key text := (
    select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
  );
begin
  -- Validate secrets are present
  if project_url is null or service_key is null then
    -- Log a warning to Postgres logs but do not block the transaction
    raise warning 'Push notification trigger skipped: Missing vault secrets (supabase_project_url or service_role_key)';
    return new;
  end if;

  -- Call the Edge Function asynchronously
  perform
    net.http_post(
      url := project_url || '/functions/v1/push-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
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
