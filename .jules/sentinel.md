## 2025-05-22 - Hardcoded Client Credentials
**Vulnerability:** Hardcoded Supabase URL and Anon Key in `src/supabaseClient.ts` as fallback defaults.
**Learning:** Even if labeled as "demo mode" or "for non-coders", hardcoded credentials in the source code are a critical vulnerability that can leak project infrastructure details.
**Prevention:** Always rely on environment variables for infrastructure configuration. Provide a clear UI state (banners/alerts) when configuration is missing instead of falling back to hardcoded secrets.

## 2025-05-23 - Client-Side Authorization Spoofing
**Vulnerability:** Persisting sensitive authorization flags (`is_admin`, `is_approved`) in `localStorage` via the application store.
**Learning:** Storing the entire user object in persistent storage allows users to manually tamper with roles and permissions in the browser, potentially bypassing frontend access gates across refreshes.
**Prevention:** Exclude sensitive user/session data from client-side persistence. Rely on authoritative session checks (e.g., Supabase `getUser()`) and re-hydrate the application state from the server on every reload.

## 2025-05-24 - Self-Escalation via Generic Update Services
**Vulnerability:** Generic update methods in services (like `profileService.updateProfile`) that accept a `Partial<Profile>` can be abused by users to modify sensitive fields (e.g., `is_admin`) if RLS is misconfigured.
**Learning:** Even with frontend route protection, the API layer must explicitly guard against self-modification of authorization flags.
**Prevention:** In service methods, fetch the current session and strip sensitive fields from the payload if the target ID matches the current user's ID. Always enforce input length limits (e.g., 50 chars for names) in both UI and service layers to prevent DoS and UI breakage.

## 2025-05-25 - Unauthenticated State Handling in Services
**Vulnerability:** Authorization stripping logic in services (e.g., `profileService.updateProfile`) only checking for `currentUser.id === id`, leaving a gap if `currentUser` is null/undefined.
**Learning:** Security checks that rely on session data must account for the absence of a session. Relying only on ID comparisons can allow unauthenticated requests to bypass frontend-intended stripping if Supabase RLS is misconfigured.
**Prevention:** Always check for `!currentUser` in addition to `currentUser.id === id` when stripping sensitive fields in the service layer. Ensure all input types (like scores being non-negative numbers) are validated before reaching the database.

## 2025-05-26 - Flawed Authorization Check Logic
**Vulnerability:** Service-layer authorization logic that only checks if `currentUser.id === id` to strip sensitive fields, but fails to account for non-admins updating OTHER users' profiles.
**Learning:** Checking for identity (`uid = id`) is insufficient for cross-resource updates. A non-admin can bypass frontend field stripping by attempting to update another user's ID, which leads to a potential IDOR if RLS is not perfectly configured for column-level security.
**Prevention:** Implement a server-side or service-layer role check (e.g., `checkIsAdmin`). Enforce that non-admins can only update their own resources and ALWAYS have sensitive fields stripped, regardless of whose resource they are attempting to modify.
