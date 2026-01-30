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
4. Run this SQL (replace the placeholder with your actual key). Make sure the key stays inside single quotes — if you remove the quotes, the SQL editor thinks your key is a table name and throws an error.
```sql
-- Replace 'your-service-role-key-here' with the actual key from
-- Project Settings -> API -> service_role (secret)
select vault.create_secret('your-service-role-key-here', 'service_role_key', 'Service role key for cron jobs');
```
If you see an error like “missing FROM-clause entry,” it usually means the key was pasted without quotes. Re-run the SQL with the key wrapped in single quotes.
If you see an error like “function vault.create_secret does not exist,” the Vault extension may not be enabled. Run this once in the SQL Editor, then re-run the `vault.create_secret` command:
```sql
create extension if not exists supabase_vault;
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

## Testing & Troubleshooting

### Quick test (from your app)
Use the **Veckobrev → Skicka test** button in the admin UI. This calls the `weekly-summary` Edge Function from the browser and should return a success message if everything is configured correctly.

**Note for non-coders:** The admin UI is just a “remote control.” It calls the Edge Function for you so you don’t have to run commands manually.

### Manual test (from your terminal)
If the UI fails, you can test the Edge Function directly with the Supabase CLI. The function expects **both**:
- an `apikey` header (your **anon** key), and
- an `Authorization` header (a **user access token**).

Example:
```bash
supabase functions invoke weekly-summary \
  --project-ref YOUR_PROJECT_REF \
  --body '{"playerId":"PLAYER_ID"}' \
  --header "apikey: YOUR_SUPABASE_ANON_KEY" \
  --header "Authorization: Bearer YOUR_USER_ACCESS_TOKEN"
```
This helps you see function errors without the browser in the way.

**Note for non-coders:** This command sends a one-off request straight to Supabase, like pressing the “Skicka test” button, but from your terminal.

**Note for non-coders:** The *user access token* is a temporary “proof you are logged in.” You can copy it from your browser’s local storage if you are signed in to the app.

### Common errors
#### 401 Unauthorized
This means the Edge Function did not accept your request. The most common causes are:
- **Missing or wrong `VITE_SUPABASE_ANON_KEY`** in your frontend environment (the key should be the *anon* key from Supabase Project Settings → API).
- **You are not logged in** (no valid user session), so the browser doesn’t send a valid auth token.

**Note for non-coders:** Think of a 401 as a “locked door.” The server didn’t see a valid “pass” (login token) attached to your request.

#### Test email says "Email not found" or sends to 0 recipients
The weekly summary emails are sent to addresses stored in **Supabase Auth**, not in the `profiles` table. Each `profiles.id` must match the corresponding Auth user ID. If a profile exists without a matching Auth user, the function cannot find an email address and skips that player.

**Note for non-coders:** Think of the `profiles` table as a “player card” and Supabase Auth as the “address book.” The email can only be sent if the player card is linked to a real address book entry.

#### 500 Internal Server Error
This usually means a required secret is missing for the function:
- `RESEND_API_KEY` (required to talk to Resend)
- `SUPABASE_SERVICE_ROLE_KEY` (required because the function reads users via the admin API)

Set them with:
```bash
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note for non-coders:** The “service role key” is a powerful server-only key that lets the function fetch users. It should never be used in your browser code.
