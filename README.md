# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Environment variables (deployment)

To connect the frontend to Supabase in any environment (local, staging, production), set these variables:

- `VITE_SUPABASE_URL`: your project URL from Supabase → Project Settings → API.
- `VITE_SUPABASE_ANON_KEY`: your Supabase **public app key**. Both of these are accepted:
  - Legacy anon key (often starts with `ey...` or includes `anon`)
  - New publishable key (starts with `sb_publishable_`)

Note for non-coders: both key formats above are public browser keys (safe to expose in frontend code). Security still comes from Supabase Row Level Security policies and authenticated user tokens. 

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Deployment (Vercel)

This project uses `pnpm`. If Vercel shows a build warning/error about the pnpm version, pin the version via the `packageManager` field in `package.json` (this repo already does). 

**Note for non-coders:** `packageManager` is just a small hint that tells Vercel which version of pnpm to use so builds are consistent.

### PWA deploy caching (avoid gray screens)

We add Vercel cache headers for `index.html` so the installed app fetches the latest HTML after a deploy, plus longer caching for hashed JS assets. See `docs/pwa-deploy-cache.md` for the reasoning and hosting steps. 

**Note for non-coders:** think of `index.html` as the app’s table of contents. If that file is stale, the app looks for files that no longer exist and you get a blank screen.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
