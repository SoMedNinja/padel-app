# Weekly Email Summary Setup

The application now supports sending a weekly ELO summary and stats email to all active players.

## Prerequisites

1.  **Resend Account**: Create a free account at [resend.com](https://resend.com).
2.  **API Key**: Obtain your Resend API key.
3.  **Supabase CLI**: Make sure you have the Supabase CLI installed and linked to your project.

## Setup Steps

### 1. Set Supabase Secret (Resend)
This stores your Resend API key securely in Supabase so the Edge Function can send emails.

**Step-by-step**
1. Copy your Resend API key from the Resend dashboard.
2. Open a terminal and make sure you are in the project folder (the same folder that has `supabase/`).
3. Run the command below, replacing the placeholder with your real key:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```
4. You should see a success message confirming the secret was saved.

**Note for non-coders:** A *secret* is a private value (like a password) that Supabase stores for you. The Edge Function reads this secret at runtime so you don't hard‑code it in your source code.

### 2. Deploy Edge Function
Deploy the `weekly-summary` function to your Supabase project so it can run in the cloud:
```bash
supabase functions deploy weekly-summary
```
If you see an error about linking, run `supabase link --project-ref <YOUR_PROJECT_REF>` first (the project reference is in your Supabase project URL).

**Note for non-coders:** An *Edge Function* is a small piece of code that runs on Supabase’s servers. “Deploy” means uploading your local code to Supabase so it can run there.

### 3. Add Service Role Key to Vault
For the automated cron job to authenticate with the Edge Function, it needs access to the `service_role` key. This key is highly privileged, so we store it in Supabase Vault and only reference it securely.

**Step-by-step**
1. In the Supabase dashboard, open **Project Settings → API**.
2. Copy the **service_role** key (the secret one, not the public anon key).
3. Open **SQL Editor** in Supabase.
4. Run this SQL (replace the placeholder with your actual key):
```sql
-- Replace 'your-service-role-key-here' with the actual key from
-- Project Settings -> API -> service_role (secret)
select vault.create_secret('your-service-role-key-here', 'service_role_key', 'Service role key for cron jobs');
```

**Note for non-coders:** *Vault* is a secure storage area in Supabase. We put the secret key there so scheduled jobs can read it without exposing it in the code.

### 4. Enable Cron Job
This step schedules the weekly email to run automatically.

**Step-by-step**
1. Open the file `supabase/migrations/20250410000000_setup_weekly_summary_cron.sql`.
2. Replace `YOUR_PROJECT_REF` in the SQL with your actual project reference (found in your Supabase project URL, e.g., `https://abcdefgh.supabase.co` → `abcdefgh`).
3. Copy the updated SQL.
4. Paste it into the Supabase **SQL Editor** and run it.

**Note for non-coders:** A *cron job* is a scheduled task. This SQL tells Supabase to run the email function every week at the specified time.

## What's included in the email?
-   **ELO Leaderboard**: The current overall standings.
-   **Individual Stats**: Matches played, ELO delta, win rate, and current ELO.
-   **Highlights**: "Veckans Skräll" (Upset), "Veckans Rysare" (Thriller), or "Veckans Kross" (Crush).
-   **MVP**: "Veckans MVP" based on performance during the week.
-   **Partners**: A summary of who the player teamed up with.
-   **Results**: A list of game results from the week.

The email is only sent to players who have played at least one match during the week.
Trigger time: **Every Sunday at 23:55**.
