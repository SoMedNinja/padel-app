# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Environment variables (deployment)

To connect the frontend to Supabase in any environment (local, staging, production), set these variables:

- `VITE_SUPABASE_URL`: your project URL from Supabase → Project Settings → API.
- `VITE_SUPABASE_ANON_KEY`: **the anon public key**, not the publishable key.
  - The anon key usually starts with `ey...` or contains `anon`.
  - The publishable key starts with `sb_publishable_` and **will not work** with Edge Functions.

Note for non-coders: the anon public key is safe to use in the browser because Supabase still enforces row-level security, but the publishable key is a different product key and won't authenticate the app correctly. 

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
