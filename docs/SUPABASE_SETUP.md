# Supabase setup (cloud)

This project uses **hosted Supabase** (no Docker required). Local `supabase start` is optional.

## 1. Create a project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Save the **Project URL** and **anon** key (Settings → API).

## 2. CLI login (run in your terminal)

Cursor’s agent cannot complete browser login. In **Git Bash** or **PowerShell** at the repo root:

```bash
npm install
npx supabase login
```

Or use a token from [Account → Access tokens](https://supabase.com/dashboard/account/tokens):

```bash
export SUPABASE_ACCESS_TOKEN=your_token   # Git Bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Project ref** is the ID in the dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`.

## 3. Link and apply schema

```bash
npx supabase link --project-ref fgnquzyzbvebwvbdyfvg
npm run supabase:push

Or one command (after `supabase login`):

```bash
npm run supabase:cloud-setup
```
```

This applies [supabase/migrations/20260322120000_initial_schema.sql](../supabase/migrations/20260322120000_initial_schema.sql).

## 4. Deploy Edge Functions

```bash
npm run supabase:functions
```

Functions use `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from the linked project automatically when deployed via CLI.

## 5. Client env

```bash
cp client/.env.example client/.env
```

Set:

- `VITE_SUPABASE_URL` = Project URL  
- `VITE_SUPABASE_ANON_KEY` = anon public key  

Use the same values in **Netlify** environment variables for production.

## 6. Auth (email)

In Supabase → **Authentication → Providers**, enable **Email**.  
For development you can disable **Confirm email** under Email settings so signup works immediately.

**Test emails:** Supabase rejects reserved domains like `ace@example.com`. Use something like `you@gmail.com` or any real domain. With confirm email off, signup logs you in immediately.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `docker: command not found` on `supabase status` | Normal if you only use cloud; use `db push`, not `start`. |
| `Access token not provided` | Run `npx supabase login` in your terminal. |
| Edge Function 401 | Deploy functions after linking; client must send logged-in JWT. |
| Realtime trades not updating | Dashboard → Database → Publications: ensure `trade_sessions` / `trade_offers` are in `supabase_realtime` (migration adds them). |

## One-shot after link

```bash
npm run supabase:setup
```
