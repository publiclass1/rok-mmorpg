# Server setup (Express + Prisma + MySQL)

## Prerequisites

- Node.js 20+
- **MySQL 8** (or compatible) — local install, XAMPP/WAMP, MariaDB, or a remote instance. The app only needs a `DATABASE_URL`; no Docker.

## Local development

1. Create a database and user in MySQL (example):

   ```sql
   CREATE DATABASE rok_mmorpg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'rok'@'localhost' IDENTIFIED BY 'rok';
   GRANT ALL ON rok_mmorpg.* TO 'rok'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. Copy `server/.env.example` → `server/.env` and set `DATABASE_URL` to match your MySQL host, user, password, and database name.

3. Apply schema and seed:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Run API + client:

   ```bash
   npm run dev:all
   ```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3001`.

## Production

- Build client: `npm run build -w client`
- Build server: `npm run build -w server`
- Run server with `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` set to your static app origin.
- Host the SPA separately (e.g. Netlify); point `VITE_API_URL` / `VITE_WS_URL` at your API host.

## Content sync

After editing mob spots in `content/ro/maps.json`:

```bash
npm run content:sync-mob-spots
```

Rebuild NPC seed after Postgres-style migration edits (legacy map SQL):

```bash
node server/scripts/build-npc-seed.mjs
npm run db:seed
```
