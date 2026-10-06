# Persistence vs realtime (Netlify + Supabase)

How character save/load (M2) relates to live multiplayer features, and why you do not host a separate WebSocket server on Netlify for this project.

## Does M2 use a socket?

**No.** [M2 — Persist core](MILESTONES.md) uses **HTTP request/response to Postgres** through the Supabase JS client:

- **Load:** [`client/src/lib/characterProgress.ts`](../client/src/lib/characterProgress.ts) — `loadCharacterSession()` runs parallel `.select()` on `character_progress`, `character_skills`, and `character_equipment`.
- **Save:** `saveCharacterSession()` — `.upsert()` on progress, delete + insert on skills and equipment.
- **World row:** `persistCharacterWorld()` — parallel session save + `characters` update (`x`, `y`, `map_id`).

Save timing is **not** realtime push from the server:

| Trigger | Behavior |
|---------|----------|
| Progression changes | Debounced ~2s — `scheduleProgressSave()` in [`WorldScene.ts`](../client/src/game/scenes/WorldScene.ts) |
| In world | Every 3s — `persistWorldState()` (also updates `characters` x, y, `map_id`) |
| Leave world / tab hidden | `leaveWorld()` and `visibilitychange` flush in [`GameView.tsx`](../client/src/components/GameView.tsx) — full `persistCharacterWorld()` |

```mermaid
flowchart LR
  subgraph netlify [Netlify SPA]
    Client[React + Phaser]
  end
  subgraph supabase [Supabase cloud]
    REST[PostgREST HTTP]
    RT[Realtime WebSocket]
    PG[(Postgres)]
    EF[Edge Functions]
  end
  Client -->|"M2 load/save"| REST
  REST --> PG
  Client -->|"map pos broadcast"| RT
  Client -->|"trade row changes"| RT
  Client -->|"storage/trade/warp"| EF
```

M2 traffic is **REST only**. There is no custom Node or socket process in this repo.

## Where realtime lives (not M2)

The browser opens a **WebSocket to `*.supabase.co`** (Supabase Realtime), not to Netlify:

| Feature | Mechanism | Code |
|---------|-----------|------|
| Other players on a map | Realtime **Broadcast** on channel `map:{mapId}` | [`client/src/game/realtime/mapChannel.ts`](../client/src/game/realtime/mapChannel.ts) |
| Trade UI updates | Realtime **postgres_changes** on `trade_sessions` / `trade_offers` | Migrations + [`GameView.tsx`](../client/src/components/GameView.tsx), [`TradeModal.tsx`](../client/src/components/TradeModal.tsx) |

Combat, drops, and mob AI run **on the client**. Persistence is **pull/push over HTTP**, not a live sync of every combat tick.

## Netlify and socket servers

**Netlify** publishes the static SPA (`client/dist` per [`netlify.toml`](../netlify.toml)). It does **not** run a long-lived WebSocket game server. Backend services stay on **Supabase** (Postgres, Auth, Realtime, Edge Functions).

You do **not** need a second free socket host for M2 or for current map/trade realtime, as long as Supabase project limits (connections, Realtime quotas) fit your usage. See [Supabase pricing](https://supabase.com/pricing) for current caps.

### Optional: your own socket server

Only consider this if you move logic server-side (authoritative combat, custom sync outside Supabase). Examples (each has free-tier limits, sleep, or cold starts):

| Option | Notes |
|--------|--------|
| **Supabase Realtime** | Best fit for this repo; already used for maps and trade. |
| **Cloudflare Workers + Durable Objects** | Small custom WS rooms. |
| **Fly.io / Render** | Small VM running `ws` / Socket.IO. |
| **PartyKit / Ably / Pusher** | Managed pub/sub with dev tiers. |
| **Netlify Functions** | Poor fit for persistent WebSockets (short-lived serverless). |

For **M6** (party, chat, guild), prefer extending **Supabase** — Realtime broadcast/presence, Postgres tables + RLS, Edge Functions for invites — same pattern as trade and map presence.

## Quick answers

1. **Does M2 use a socket?** No — HTTP upsert/select to Postgres via the Supabase client.
2. **Free socket server for Netlify?** Supabase Realtime is the managed socket layer; Netlify only serves the app. A separate socket host is optional only if you deliberately leave Supabase Realtime.

## Related docs

- [MILESTONES.md](MILESTONES.md) — M2 deliverables
- [IRO_REFERENCE.md](IRO_REFERENCE.md) — progression tables and system matrix
- [SUPABASE_SETUP.md](SUPABASE_SETUP.md) — Realtime publication troubleshooting for trades
