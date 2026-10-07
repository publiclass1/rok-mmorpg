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

Set the admin dashboard password (required for `admin-panel` Edge Function):

```bash
npx supabase secrets set ADMIN_PANEL_PASSWORD=your-secure-password
```

Deploy GM and admin functions after schema migration `20261007200000_gm_and_presence.sql`:

```bash
npx supabase functions deploy gm-command admin-panel
```

`admin-panel` uses `verify_jwt = false` in [supabase/config.toml](../supabase/config.toml) so `/admin` works without logging into the game. Redeploy after changing that file.

## 5. Client env

```bash
cp client/.env.example client/.env
```

Set:

- `VITE_SUPABASE_URL` = Project URL  
- `VITE_SUPABASE_ANON_KEY` = anon public key  

Use the same values in **Netlify** environment variables for production.

## 6. Auth (username + password)

The client uses **username and password** only. Supabase Auth still stores a synthetic email internally (`username@<domain>`); no real inbox is used.

In Supabase → **Authentication → Providers**, enable **Email** and **turn off Confirm email** under Email settings so signup logs in immediately and **no auth emails are sent** (avoids rate limits).

Optional in `client/.env`: `VITE_AUTH_EMAIL_DOMAIN` — defaults to `<project-ref>.account.local`. Keep this stable; changing it breaks login for existing accounts unless you migrate users.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `docker: command not found` on `supabase status` | Normal if you only use cloud; use `db push`, not `start`. |
| `Access token not provided` | Run `npx supabase login` in your terminal. |
| Edge Function 401 | Deploy functions after linking; client must send logged-in JWT. |
| Realtime trades not updating | Dashboard → Database → Publications: ensure `trade_sessions` / `trade_offers` are in `supabase_realtime` (migration adds them). |
| Party/guild/vendor realtime | Apply `20260324100000_m6_social.sql`; deploy `party-manage`, `guild-manage`, `vendor-manage`. |
| Other players not visible on map | Client uses Realtime **Broadcast** (`map:{mapId}`); check project Realtime is enabled and quotas. See [PERSISTENCE_AND_REALTIME.md](PERSISTENCE_AND_REALTIME.md). |
| Character list shows other accounts’ chars | Apply latest migrations (`npm run supabase:push`). Old RLS policy exposed all characters to every user. |

## One-shot after link

```bash
npm run supabase:setup
```
