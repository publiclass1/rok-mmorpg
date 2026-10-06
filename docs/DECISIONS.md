# Architecture decisions (v1)

- **UI:** React for auth, character select, inventory, storage, and trade; Phaser 3 for the world scene only.
- **Movement:** WASD (8-direction style on a tile grid with smooth pixel movement and collision).
- **Character names:** Globally unique (enforced in database).
- **Hosting target:** Netlify (static SPA); config in `netlify.toml`.
- **Backend & realtime:** Supabase Postgres + Auth + Edge Functions; character persistence (M2) over HTTP. Live map positions and trade UI use **Supabase Realtime** (managed WebSocket to Supabase, not a socket server on Netlify). See [PERSISTENCE_AND_REALTIME.md](PERSISTENCE_AND_REALTIME.md).
