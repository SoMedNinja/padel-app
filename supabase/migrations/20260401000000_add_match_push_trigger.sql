-- Enable pg_net extension if not already enabled (it should be)
create extension if not exists pg_net;

-- Function to handle new match inserts and trigger the push notification function
create or replace function public.handle_new_match()
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
        'type', 'INSERT',
        'record', row_to_json(new)
      )
    );
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_match_created on public.matches;
create trigger on_match_created
after insert on public.matches
for each row execute function public.handle_new_match();
