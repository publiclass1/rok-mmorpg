# Browser Ragnarok-like

A simple browser MMORPG inspired by Ragnarok Online — for fun and game-dev learning. Shared 2D tile maps, account/characters, Kafra-style storage, NPC warps, and player trading.

**Design reference:** [iRO Wiki](https://irowiki.org/) (Pre-Renewal / Classic). See [docs/IRO_REFERENCE.md](docs/IRO_REFERENCE.md) for system status, [docs/MILESTONES.md](docs/MILESTONES.md) for the step-by-step roadmap, and [content/ro/](content/ro/) for curated game data. Validate content with `npm run content:validate`.

## Features

- Username + password accounts (Supabase Auth; no email verification)
- Up to 3 characters per account (globally unique names)
- Account storage shared across characters
- NPCs: storage, save point, teleport
- Player trading with lock + dual confirm (Edge Functions)
- Shared maps with realtime position broadcast
- Character progression (levels, stats, skills, equipment, session gear bag, HP/MP) persisted to Supabase

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
2. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and link the project, or paste SQL from `supabase/migrations/` in the SQL editor (include `20260323140000_character_progress.sql` for progression save).
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
# Optional: VITE_MOB_EXP_MULTIPLIER=100 (mob base/job EXP × multiplier on kill)
cd ..
npm run dev
```

### 3. Controls in-world

- **Click** — walk to point (RO-style); **click mob** to chase and attack
- **Space** — jump
- **1**–**9** — skill bar (`1` = Basic Attack)
- **Alt+S** / **Stats** — STR/AGI/VIT/INT/DEX/LUK (stat points from base level)
- **Alt+I** / **Inventory** — session gear + DB stacks; double-click to equip
- **Alt+E** / **Equip** — equipment slots; unequip per slot
- **Alt+K** / **Skills** — job skills (skill points from job level)
- **E** — interact with nearby NPC (storage / save / warp)
- On `field_01`, mobs roam, aggro, and fight back; kill for Base/Job EXP (saved to your character)
- **Trade** — use sidebar when another player is on the same map

## Project layout

- `client/` — React UI + Phaser world
- `supabase/migrations/` — schema, RLS, seeds
- `supabase/functions/` — server-validated storage, save, warp, trade

## Maps

- `prontera` — hub town (Kafra, save, warp to field)
- `field_01` — field with return warp, rock obstacles, roaming Porings

Tile graphics are generated at runtime for dev; you can replace them with `client/public/tiles.png` and edit maps in [Tiled](https://www.mapeditor.org/), exporting JSON to `client/public/maps/`.

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

Build uses **Node 22** and **Vite 6** (see `netlify.toml`) so Netlify installs native bundler deps reliably.

Supabase (database, auth, Realtime, Edge Functions) stays on [supabase.com](https://supabase.com) — Netlify only hosts the browser app.

**Local vs Netlify:** use `client/.env` for `npm run dev`; use Netlify env vars for live builds (Vite bakes `VITE_*` in at build time).
