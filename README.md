# ROK-MMORPG

A simple browser MMORPG inspired by Ragnarok Online — for fun and game-dev learning. Shared 2D tile maps, account/characters, Kafra-style storage, NPC warps, and player trading.

**Design reference:** [iRO Wiki](https://irowiki.org/) (Pre-Renewal / Classic). See [docs/IRO_REFERENCE.md](docs/IRO_REFERENCE.md) for system status, [docs/MILESTONES.md](docs/MILESTONES.md) for the step-by-step roadmap, [docs/SERVER_SETUP.md](docs/SERVER_SETUP.md) for the Express + MySQL backend, and [content/ro/](content/ro/) for curated game data. Validate content with `npm run content:validate`. Regenerate icons with `npm run icons` or `icons:skills` / `icons:weapons` ([`docs/ASSET_ICONS.md`](docs/ASSET_ICONS.md)).

## Features

- Username + password accounts (JWT; no email)
- Up to 3 characters per account (globally unique names)
- Account storage shared across characters
- NPCs: storage, save point, teleport
- Player trading with lock + dual confirm
- Shared maps with realtime position broadcast (Socket.io)
- Character progression persisted via REST API

## Tech stack

- **Client:** Vite, React, TypeScript, Phaser 4
- **Maps:** Tiled (`.tmj` in `client/public/maps/`)
- **Server:** Node.js, Express, Prisma, MySQL, Socket.io
- **Hosting:** Netlify (static SPA) + separate API host for the game server

See [docs/DECISIONS.md](docs/DECISIONS.md) for v1 choices (React + Phaser, WASD movement).

## Local development

1. Run **MySQL** locally (or point at an existing server) and create a database; set `DATABASE_URL` in `server/.env` (see `server/.env.example`).
2. Migrate and seed: `npm run db:migrate && npm run db:seed`
3. Run client + API: `npm run dev:all`

Details: [docs/SERVER_SETUP.md](docs/SERVER_SETUP.md).

The Vite dev server proxies `/api` and `/socket.io` to port `3001`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:all` | Client + server |
| `npm run dev:server` | API only |
| `npm run content:sync-mob-spots` | Sync mob spots JSON into server combat validation |
| `npm run build` | Build client and server |

Legacy Postgres migration SQL under `supabase/migrations/` is still used by the map admin tool and NPC seed extraction (`server/scripts/build-npc-seed.mjs`).
