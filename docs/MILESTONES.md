# Development milestones

Execute in order unless noted. **Ruleset:** Pre-Renewal / Classic per [iRO Wiki](https://irowiki.org/). Design detail: [IRO_REFERENCE.md](IRO_REFERENCE.md), formulas: [PRE_RENEWAL_FORMULAS.md](PRE_RENEWAL_FORMULAS.md).

| # | Milestone | Status |
|---|-----------|--------|
| M1 | iRO Wiki reference + content layer | **Done** |
| M2 | Persist core | **Done** |
| M3 | Pre-Renewal combat & economy (data-driven) | **Done** |
| M4 | Job change + first job tree | **Done** |
| M5 | World & NPC services | **Done** |
| M6 | Social & trade depth | Not started |
| M7+ | Late-game / out of scope for now | — |

Update the **Status** column as you finish each milestone.

---

## M1 — iRO Wiki reference + content layer (done)

**Goal:** Single source of truth for curated game data and documentation; no major gameplay rewrite.

**Delivered:**

- [IRO_REFERENCE.md](IRO_REFERENCE.md) — system matrix, custom rules, DB sketch
- [PRE_RENEWAL_FORMULAS.md](PRE_RENEWAL_FORMULAS.md) — formula targets vs current code
- [content/ro/](../content/ro/) — `manifest`, `jobs`, `skills`, `items`, `mobs`, `maps`
- `client/src/content/ro/` — types, `loadRoContent()`, validation
- `skillsConfig`, `equipmentConfig`, `mobConfig` read from JSON
- `npm run content:validate`

**Verify:** `npm run content:validate` and `npm run build` pass; game plays as before (Poring, novice, equip UI).

---

## M2 — Persist core

**Goal:** Character progression survives refresh/logout; clear policy for HP/MP.

**Prerequisites:** M1.

**HP/MP policy:** Persist current HP/MP on save; restore on login and clamp to derived max. New characters use `NULL` HP/MP in DB until first save → client fills to max on load.

**Delivered:**

- [x] HP/MP policy documented above and in [IRO_REFERENCE.md](IRO_REFERENCE.md)
- [x] Migration `character_progress`, `character_skills`, `character_equipment` — [`20260323140000_character_progress.sql`](../supabase/migrations/20260323140000_character_progress.sql)
- [x] RLS: owner read/write on progress, skills, equipment
- [x] Client [`characterProgress.ts`](../client/src/lib/characterProgress.ts) load/save
- [x] Client: load on enter world; debounced + periodic save; save on leave world
- [x] Extended `public.items` columns + equippable item seeds from content
- [x] Docs updated

**Verify:** Level up, allocate stat, equip item, refresh — state matches. Second device/login sees same progress.

**Out of scope for M2:** Combat formula changes, drops, job change NPC.

---

## M3 — Pre-Renewal combat & economy (data-driven)

**Goal:** Wiki-oriented combat and rewards; consumables and drops use content JSON.

**Prerequisites:** M2 recommended (loot/levels should persist).

**Tasks:**

- [x] Add `content/ro/expTables.json`; wire [exp.ts](../client/src/game/combat/exp.ts) to Pre-Renewal tables
- [x] Align [statFormulas.ts](../client/src/game/character/statFormulas.ts) with [PRE_RENEWAL_FORMULAS.md](PRE_RENEWAL_FORMULAS.md) (HP/SP, stat point cost, base cap 99)
- [x] Implement HIT/FLEE and damage pipeline ([Damage](https://irowiki.org/wiki/Damage))
- [x] Use mob `element`, `size`, DEF/MDEF from [mobs.json](../content/ro/mobs.json) in combat
- [x] Implement drops from `mobs.json` `drops[]` (rates as documented in content)
- [x] Red Potion (and consumable use) from [items.json](../content/ro/items.json)
- [x] Decide: keep `runtime.*` combat tuning vs wiki ATK/HP until balance pass
- [x] Update system matrix in IRO_REFERENCE

**Verify:** Kill Poring → Jellopy (or configured drops); potion heals; EXP curves match documented tables.

**Out of scope:** Server-side drop validation (can be M7+).

---

## M4 — Job change + first job tree

**Goal:** One complete Novice → 1st job path as template for other classes.

**Prerequisites:** M2 (job id + skills persisted); M3 optional but helps testing kills/EXP.

**Tasks:**

- [x] Job Master NPC type + UI/dialog flow
- [x] Implement job change (requirements: job level, items/zeny if desired)
- [x] Pick template job (e.g. Swordman): full skill list in `skills.json` with prerequisites
- [x] Move misplaced novice placeholders (Bash, Heal, etc.) to correct jobs per wiki
- [x] Enforce `maxJobLevel` from [jobs.json](../content/ro/jobs.json)
- [x] Skills window + skill bar respect job-gated skills
- [x] Content validate + docs update

**Verify:** Novice at required job level changes to 1st job; learn and use that job’s skills; persist after refresh.

---

## M5 — World & NPC services

**Goal:** More places to play; classic town services.

**Prerequisites:** M3–M4 helpful for field grinding; M2 for any reward persistence.

**Tasks:**

- [x] Add maps to Tiled + [maps.json](../content/ro/maps.json); warps/NPCs in DB seeds
- [x] More mobs and `mobSpawns` in content
- [x] NPC shop (buy/sell) using item ids and zeny
- [x] Healer NPC (HP/MP restore per policy from M2)
- [x] Expand Kafra/teleport destinations to match new maps

**Verify:** Travel hub → field → grind → shop → storage; no regressions on save/trade.

---

## M6 — Social & trade depth

**Goal:** Multiplayer progression and economy beyond 1:1 trade.

**Prerequisites:** M2; stable realtime on maps.

**Tasks:**

- [ ] Party: invite, roster, optional EXP share rules
- [ ] Guild basics (creation, tag, roster) — scope as minimal viable
- [ ] Chat channel(s) or refine sidebar chat
- [ ] Vending or player shop stall (optional, larger scope)

**Verify:** Two+ clients party and grind; trade/storage still work with RLS.

---

## M7+ — Later / optional

Not scheduled; track ideas here:

- Cards, refine, enchant
- Pets, homunculus
- PvP, War of Emperium
- Server-authoritative combat and drop validation
- Weight limit and overweight penalties ([Weight](https://irowiki.org/wiki/Weight))

---

## Between milestones

You can anytime:

- Add rows to `content/ro/*.json` and run `npm run content:validate`
- Fix UI (e.g. equipment slots) without changing milestone order
- Update [IRO_REFERENCE.md](IRO_REFERENCE.md) status column when a system moves forward
