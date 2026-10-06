# Browser Ragnarok-like

A simple browser MMORPG inspired by Ragnarok Online — for fun and game-dev learning. Shared 2D tile maps, account/characters, Kafra-style storage, NPC warps, and player trading.

## Features

- Email signup/login (Supabase Auth)
- Up to 3 characters per account (globally unique names)
- Account storage shared across characters
- NPCs: storage, save point, teleport
- Player trading with lock + dual confirm (Edge Functions)
- Shared maps with realtime position broadcast

## Tech stack

- **Client:** Vite, React, TypeScript, Phaser 4
- **Maps:** Tiled (`.tmj` in `client/public/maps/`)
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Hosting:** Netlify (static SPA)
- **Repo:** GitHub

See [docs/DECISIONS.md](docs/DECISIONS.md) for v1 choices (React + Phaser, WASD movement).

## Local development

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and link the project, or paste SQL from `supabase/migrations/` in the SQL editor.
3. Deploy Edge Functions:

```bash
supabase functions deploy storage-transfer
supabase functions deploy save-point
supabase functions deploy teleport
supabase functions deploy trade-manage
```

4. Enable **Realtime** for `trade_sessions` and `trade_offers` if not applied by migration.

### 2. Client

```bash
npm install
cd client
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
cd ..
npm run dev
```

### 3. Controls in-world

- **WASD** — move
- **E** — interact with nearby NPC (storage / save / warp)
- **Trade** — use sidebar when another player is on the same map

## Project layout

- `client/` — React UI + Phaser world
- `supabase/migrations/` — schema, RLS, seeds
- `supabase/functions/` — server-validated storage, save, warp, trade

## Maps

- `prontera` — hub town (Kafra, save, warp to field)
- `field_01` — field with return warp

Replace tile graphics via `client/public/tiles.png` and edit maps in [Tiled](https://www.mapeditor.org/), exporting JSON to `client/public/maps/`.

## Deploy on Netlify

1. Push the repo to GitHub (or GitLab/Bitbucket).
2. In [Netlify](https://app.netlify.com): **Add new site** → **Import from Git** → select the repo.
3. Netlify reads [netlify.toml](netlify.toml) automatically:
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
4. **Site settings → Environment variables** (required for production):

   | Key | Value |
   |-----|--------|
   | `VITE_SUPABASE_URL` | Project URL from Supabase → Settings → API |
   | `VITE_SUPABASE_ANON_KEY` | `anon` public key (same place) |

5. Deploy. After each push to your production branch, Netlify rebuilds the client.

Supabase (database, auth, Realtime, Edge Functions) stays on [supabase.com](https://supabase.com) — Netlify only hosts the browser app.

**Local vs Netlify:** use `client/.env` for `npm run dev`; use Netlify env vars for live builds (Vite bakes `VITE_*` in at build time).
