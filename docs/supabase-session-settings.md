# Supabase session settings (plain-language guide)

This guide maps the Dashboard screens you shared to the settings we changed locally so you can confirm everything lines up.

## 1) Access token (JWT) expiry (short-lived ID badge)
**Where in the Dashboard:**
- **Project Settings → JWT Keys → Access token expiry time**

**What it means (non‑coder note):**
- The access token is like a **short‑lived ID badge** your app shows to Supabase when it makes API calls.
- It expires on purpose so that if someone steals it, it only works for a short time.

**What value to set:**
- Set **Access token expiry time = 604800 seconds (7 days)** to match local config.

## 2) Refresh token settings (long-lived session ticket)
**Where in the Dashboard:**
- **Authentication → Sessions → Refresh Tokens**

**What it means (non‑coder note):**
- A refresh token is a **long‑lived session ticket**.
- When the short‑lived ID badge expires, this ticket automatically gets a new badge so the user stays signed in.

**What to check / set:**
- **Detect and revoke potentially compromised refresh tokens:** keep **enabled** (safer).
- **Refresh token reuse interval:** this is how long the *same* refresh token can be reused to request a new access token.
  - If you want long‑lived sessions, set this to **30+ days in seconds** (e.g., **2592000** = 30 days, **5184000** = 60 days).
  - Note: a longer reuse interval makes sessions stickier, but it also means a stolen refresh token could be reused for longer. Keep it as long as your security posture allows.

## 3) Optional session timebox / inactivity timeout
**Where in the Dashboard:**
- **Authentication → Sessions → User Sessions** (requires Pro plan)

**What it means (non‑coder note):**
- **Time‑box** forces a full sign‑in after a maximum time.
- **Inactivity timeout** forces sign‑in after a period of no activity.

**How to keep 30+ day sessions:**
- Set these to **0 / never** if you want long‑lived sessions.

## Local dev mapping
These Dashboard settings map to local config in `supabase/config.toml`:
- **Access token expiry time** → `jwt_expiry` (now 604800 seconds)
- **Refresh token reuse interval** → `refresh_token_reuse_interval`
- **Detect and revoke** → `enable_refresh_token_rotation`

