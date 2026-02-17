-- Rename and update the trigger function to be generic
create or replace function public.handle_push_event()
returns trigger
language plpgsql
security definer
as $$
declare
  -- TODO: YOU MUST REPLACE THESE VALUES FOR PUSH NOTIFICATIONS TO WORK
  -- For local development: 'http://host.docker.internal:54321'
  -- For production: 'https://<project-ref>.supabase.co'
  project_url text := 'https://YOUR_PROJECT_REF.supabase.co';

  -- TODO: Replace with your Supabase Anon Key (found in Project Settings > API)
  anon_key text := 'YOUR_ANON_KEY';
begin
  -- Call the Edge Function asynchronously
  perform
    net.http_post(
      url := project_url || '/functions/v1/push-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
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
