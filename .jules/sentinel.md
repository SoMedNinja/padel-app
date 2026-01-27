## 2025-05-22 - Hardcoded Client Credentials
**Vulnerability:** Hardcoded Supabase URL and Anon Key in `src/supabaseClient.ts` as fallback defaults.
**Learning:** Even if labeled as "demo mode" or "for non-coders", hardcoded credentials in the source code are a critical vulnerability that can leak project infrastructure details.
**Prevention:** Always rely on environment variables for infrastructure configuration. Provide a clear UI state (banners/alerts) when configuration is missing instead of falling back to hardcoded secrets.
