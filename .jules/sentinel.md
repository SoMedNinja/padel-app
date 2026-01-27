## 2025-05-22 - Hardcoded Client Credentials
**Vulnerability:** Hardcoded Supabase URL and Anon Key in `src/supabaseClient.ts` as fallback defaults.
**Learning:** Even if labeled as "demo mode" or "for non-coders", hardcoded credentials in the source code are a critical vulnerability that can leak project infrastructure details.
**Prevention:** Always rely on environment variables for infrastructure configuration. Provide a clear UI state (banners/alerts) when configuration is missing instead of falling back to hardcoded secrets.

## 2025-05-23 - Client-Side Authorization Spoofing
**Vulnerability:** Persisting sensitive authorization flags (`is_admin`, `is_approved`) in `localStorage` via the application store.
**Learning:** Storing the entire user object in persistent storage allows users to manually tamper with roles and permissions in the browser, potentially bypassing frontend access gates across refreshes.
**Prevention:** Exclude sensitive user/session data from client-side persistence. Rely on authoritative session checks (e.g., Supabase `getUser()`) and re-hydrate the application state from the server on every reload.
