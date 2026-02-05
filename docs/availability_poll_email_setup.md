# Availability Poll Email Setup

The application supports sending availability-poll emails via the `availability-poll-mail` Edge Function.

## Prerequisites

1. **Supabase CLI**: Installed and linked to your project.
2. **Resend account**: A verified sender/domain in [resend.com](https://resend.com).
3. **Supabase project access**: So you can copy API keys and set secrets.

## Required secrets and auth mode

Set the following secrets for the Edge Function:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `APP_BASE_URL`

Function auth mode:

- `verify_jwt = false` for `availability-poll-mail` (configured in `supabase/config.toml`).

**Note for non-coders:** `verify_jwt` is a gateway check done by Supabase before your function code runs. When it is `false`, the function can still do its own login checks inside the code (which this function does with the `Authorization` token).

## Setup steps

### 1) Save required secrets in Supabase

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  RESEND_API_KEY=re_your_resend_key \
  APP_BASE_URL=https://your-app-domain.com
```

**Note for non-coders:** Secrets are private values stored on the server. They are like passwords for server tasks and should never be put into browser/frontend code.

### 2) Deploy the function

```bash
supabase functions deploy availability-poll-mail
```

If needed first:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Note for non-coders:** Deploy means “upload this function to Supabase so it runs online.”

## Manual invoke example (terminal)

Use this to test the function directly:

```bash
supabase functions invoke availability-poll-mail \
  --project-ref YOUR_PROJECT_REF \
  --body '{"pollId":"YOUR_POLL_ID"}' \
  --header "apikey: YOUR_SUPABASE_ANON_KEY" \
  --header "Authorization: Bearer YOUR_USER_ACCESS_TOKEN"
```

Optional test-recipient mode (must match the allowed address in function code):

```bash
supabase functions invoke availability-poll-mail \
  --project-ref YOUR_PROJECT_REF \
  --body '{"pollId":"YOUR_POLL_ID","testRecipientEmail":"name@example.com"}' \
  --header "apikey: YOUR_SUPABASE_ANON_KEY" \
  --header "Authorization: Bearer YOUR_USER_ACCESS_TOKEN"
```

**Note for non-coders:** The `apikey` identifies your project, and the bearer token proves which logged-in user is calling the function.

## Troubleshooting

### 401 Unauthorized

Check the following in order:

1. **Gateway block (`execution_id = null`)**  
   If function logs/error rows show `execution_id = null`, the request was blocked at the Supabase gateway before function code ran. Most often this means wrong headers/keys or a JWT/gateway auth mismatch.

2. **Wrong anon key type**  
   Ensure `apikey` is your Supabase **anon public key** from Project Settings → API. Do **not** use a publishable key variant (for example keys starting with `sb_publishable_`).

3. **Missing or expired user session**  
   Ensure `Authorization: Bearer <token>` is present and fresh. This function validates the caller with `auth.getUser(accessToken)`, so missing/expired tokens return 401.

**Note for non-coders:** A 401 means “the server could not confirm your identity.” Think of it as showing up at a locked door without a valid badge.

### 500 Internal Server Error

Usually one of the required secrets is missing (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`). Re-run the secret command and redeploy.
