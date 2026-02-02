-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Note: Before running this, you MUST:
-- 1. Add your weekly summary cron token to the vault (see docs/weekly_email_setup.md)
-- 2. Deploy the edge function: `supabase functions deploy weekly-summary`
-- 3. Replace YOUR_PROJECT_REF in the URL below.

-- Schedule the weekly summary email to be sent every Sunday at 23:55
select cron.schedule(
  'send-weekly-summary',
  '55 23 * * 0',
  $$
  select
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/weekly-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_summary_cron_token' limit 1)
      )
    );
  $$
);
