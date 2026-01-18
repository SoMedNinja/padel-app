# Remove profile approval emails

This app no longer sends emails for profile approval changes. Use the steps below to remove the Supabase database triggers/functions and Edge Functions related to emailing.

## SQL cleanup (run in Supabase SQL editor)

```sql
-- Drop the approval notification trigger + function (if present)
drop trigger if exists profiles_notify_approval_change on public.profiles;
drop function if exists public.notify_profile_approval_change();

drop trigger if exists profile_approval_needed on public.profiles;
drop function if exists public.notify_profile_approval_needed();
```

### Optional: remove related secrets/settings

Only run these if they are not used elsewhere in your project.

```sql
select vault.delete_secret('profile_approval_webhook_url');
select vault.delete_secret('service_role_key');
```

### Optional: remove extensions

Only remove these if they are not used elsewhere in your database.

```sql
drop extension if exists pg_net;
drop extension if exists supabase_vault;
```

## Edge function cleanup

Remove the Edge Functions from your Supabase project:

- `profile-approval-email`
- `profile-approval-needed`
