# Tournament Summary Schedule

This document explains how the tournament summary Edge Function is scheduled to run automatically.

## What it does
The scheduled job calls the `tournament-summary` Edge Function every **15 minutes** to keep tournament summaries up to date.

**Note for non-coders:** Think of this as an automatic reminder that runs on a timer, so the summaries stay fresh without anyone pressing a button.

## Setup steps

### 1. Store the service role key in Vault
The scheduled job needs the **service role** key so it can authenticate with the Edge Function.

**Step-by-step**
1. In the Supabase dashboard, open **Project Settings → API**.
2. Copy the **service_role** key (the secret one, not the public anon key).
3. Open **SQL Editor** in Supabase and run:
```sql
-- Replace with the actual key from Project Settings -> API -> service_role (secret)
select vault.create_secret('your-service-role-key-here', 'service_role_key', 'Service role key for cron jobs');
```

**Note for non-coders:** The service role key is a powerful “master key.” We store it in Vault so it’s protected and never exposed in the app.

### 2. Deploy the Edge Function
```bash
supabase functions deploy tournament-summary
```

**Note for non-coders:** “Deploy” just means uploading your local function code so it can run on Supabase’s servers.

### 3. Schedule the cron job
1. Open `supabase/migrations/20250411110000_setup_tournament_summary_cron.sql`.
2. Replace `YOUR_PROJECT_REF` with your project ref (from your Supabase URL).
3. Copy the SQL into the Supabase **SQL Editor** and run it.

**Note for non-coders:** This SQL tells Supabase to run the function every 15 minutes automatically.

## Schedule details
- **Frequency:** Every 15 minutes
- **Cron expression:** `*/15 * * * *`

**Note for non-coders:** A cron expression is just the shorthand schedule. `*/15` means “every 15 minutes.”
