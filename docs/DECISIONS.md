# Architecture decisions (v1)

- **UI:** React for auth, character select, inventory, storage, and trade; Phaser 3 for the world scene only.
- **Movement:** WASD (8-direction style on a tile grid with smooth pixel movement and collision).
- **Character names:** Globally unique (enforced in database).
- **Hosting target:** Vercel (static SPA); compatible with Netlify with the same build output.
