# Persistence vs realtime

## Persistence (M2)

Character load/save uses **HTTP** to the game server (`/api/characters/:id/session`, `/api/characters/:id/progress`, `/api/characters/:id/world`). The browser no longer talks to Postgres directly.

## Realtime

Multiplayer presence, chat, combat FX, and several social notifications use **Socket.io** on the same Express process (`/socket.io`). Clients join rooms such as `map:{mapId}`, `party:{partyId}`, and `trade:{sessionId}`.

Trade/party/duel DB changes are pushed via server-emitted socket events (for example `trade_session`, `party_request`, `duel_session`) instead of Supabase `postgres_changes`.

## Hosting

- **Netlify (or similar):** static `client/dist` only.
- **API host:** run `server` with MySQL; set `VITE_API_URL` / `VITE_WS_URL` on the client build.

See [SERVER_SETUP.md](SERVER_SETUP.md).
