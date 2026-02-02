-- Enable pg_cron and pg_net extensions (needed for scheduled jobs + HTTP calls).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Note: Before running this, you MUST:
-- 1. Add your service role key to the vault (see docs/tournament_summary_schedule.md).
-- 2. Deploy the edge function: `supabase functions deploy tournament-summary`
-- 3. Replace YOUR_PROJECT_REF in the URL below.
--
-- Note for non-coders: A "cron job" is just a scheduled task. This one will call
-- the Edge Function automatically every 15 minutes so no one has to click a button.

-- Schedule the tournament summary job to run every 15 minutes.
select cron.schedule(
  'send-tournament-summary',
  '*/15 * * * *',
  $$
  select
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/tournament-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        -- Note for non-coders: The "Authorization: Bearer ..." header is like a password
        -- that proves the caller is allowed to run the function.
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'service_role_key'
          limit 1
        )
      )
    );
  $$
);
