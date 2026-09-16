# React + Vite

## Backend foundation

The project includes a Vercel serverless tasks API backed by Vercel Postgres:

- `db/schema.sql` creates the task and habit tables.
- `api/tasks.js` provides authenticated-by-header CRUD endpoints.
- `api/habits.js` provides authenticated habit CRUD and check-in endpoints.
- `api/auth.js` provides email/password registration, login, session lookup, and logout.
- Copy `.env.example` values into Vercel project environment variables.
- Run `db/schema.sql` once in the connected Postgres SQL editor before using the API.

The task and habit APIs accept the secure `focusflow_session` cookie created by `api/auth.js`. The `x-focusflow-user` header remains as a local-development fallback.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
