# Weekly Email Summary Setup

The application now supports sending a weekly ELO summary and stats email to all active players.

## Prerequisites

1.  **Resend Account**: Create a free account at [resend.com](https://resend.com).
2.  **API Key**: Obtain your Resend API key.
3.  **Supabase CLI**: Make sure you have the Supabase CLI installed and linked to your project.

## Setup Steps

### 1. Set Supabase Secret (Resend)
Run the following command in your terminal to store the Resend API key:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 2. Deploy Edge Function
Deploy the `weekly-summary` function to your Supabase project:
```bash
supabase functions deploy weekly-summary
```

### 3. Add Service Role Key to Vault
For the automated cron job to authenticate with the Edge Function, it needs access to the `service_role` key. Run this SQL in your Supabase SQL Editor:
```sql
-- Replace 'your-service-role-key-here' with the actual key from
-- Project Settings -> API -> service_role (secret)
select vault.create_secret('your-service-role-key-here', 'service_role_key', 'Service role key for cron jobs');
```

### 4. Enable Cron Job
Run the SQL migration in `supabase/migrations/20250410000000_setup_weekly_summary_cron.sql` using the Supabase SQL Editor.
**Important**: Replace `YOUR_PROJECT_REF` in the SQL with your actual Supabase project reference (found in your project settings URL, e.g., `https://abcdefgh.supabase.co`).

## What's included in the email?
-   **ELO Leaderboard**: The current overall standings.
-   **Individual Stats**: Matches played, ELO delta, win rate, and current ELO.
-   **Highlights**: "Veckans Skräll" (Upset), "Veckans Rysare" (Thriller), or "Veckans Kross" (Crush).
-   **MVP**: "Veckans MVP" based on performance during the week.
-   **Partners**: A summary of who the player teamed up with.
-   **Results**: A list of game results from the week.

The email is only sent to players who have played at least one match during the week.
Trigger time: **Every Sunday at 23:55**.
