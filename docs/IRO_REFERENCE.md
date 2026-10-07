# iRO Wiki design reference (Pre-Renewal)

This project uses [iRO Wiki](https://irowiki.org/) as the **canonical design reference** for systems, names, and Pre-Renewal / Classic rules. Gameplay data lives in [`content/ro/`](../content/ro/); runtime code loads it via [`client/src/content/ro/loadContent.ts`](../client/src/content/ro/loadContent.ts).

**Ruleset:** Pre-Renewal (not Renewal). See [`PRE_RENEWAL_FORMULAS.md`](PRE_RENEWAL_FORMULAS.md) for formulas we intend to port.

**Execution order:** [`MILESTONES.md`](MILESTONES.md) — M1–M6 done; next is M7+.

## Custom rules (this game ≠ vanilla iRO)

| Topic | Choice |
|-------|--------|
| Client | Vite + React UI, Phaser 4 world, Netlify static host |
| Combat visuals | Pixel character sprites (palette-swapped player, NPC sheets) + Phaser tweens (attack/bash, flinch, mob death); skill bar uses `/skills/*.svg` icons only — not in-world casts |
| Movement | Click-to-walk + jump (not classic RO keyboard-only) |
| Progression persistence | Base/job/stats/skills/equip/session bag/HP/MP saved in Postgres (`character_progress`, `character_skills`, `character_equipment`); position/zeny/stack inventory as before |
| Equipment slots | RO-style slots in data (`headTop`, `offhand`, etc.); UI may show a subset |
| Authority | Supabase Edge Functions validate storage, save point, warp, trade; combat/loot are client-trusted until a later milestone |
| Content pipeline | Manual curation from wiki (no scraping); optional `sourceUrl` per row in JSON |

## System status matrix

| System | Wiki | Status | Code / data |
|--------|------|--------|-------------|
| Accounts & characters | — | implemented | `client/src/lib/accountAuth.ts`, `supabase/migrations/*` |
| Stats (STR–LUK) | [Stats](https://irowiki.org/wiki/Stats) | partial | Pre-Renewal HP/SP tables + stat point grants in `statFormulas.ts` / `content/ro/expTables.json` |
| Base / job EXP | [Experience](https://irowiki.org/wiki/Experience) | implemented | `content/ro/expTables.json`, `combat/exp.ts` (Pre-Renewal tables, cap 99) |
| Jobs & job change | [Classes](https://irowiki.org/wiki/Classes) | partial | `jobs.json` (Knight, Hunter); Job Master in `jobMaster.json` (overrides DB); starter kit `jobStarterGear.json` |
| Skills | [Skills](https://irowiki.org/wiki/Skills) | partial | `content/ro/skills.json`; Swordman tree + prerequisites; Bash usable in combat |
| Items & equipment | [Items](https://irowiki.org/wiki/Items), [Equipment](https://irowiki.org/wiki/Equipment) | partial | `content/ro/items.json` (`requiredBaseLevel`, `requiredJobIds`); equip enforced in `equipRequirements.ts` / `applyCharacterAction.ts`; `equipmentConfig.ts` |
| Inventory weight | [Weight](https://irowiki.org/wiki/Weight) | planned | — |
| Monsters & drops | [Monsters](https://irowiki.org/wiki/Monsters) | implemented | `mobs.json` drops (rAthena pre-re rates) + `loot.json` zeny QoL & level bands; `combat/drops.ts` |
| Combat & damage | [Damage](https://irowiki.org/wiki/Damage) | partial | `combat/damage.ts`, `WorldScene.ts` (HIT/FLEE, DEF, element/size); mob `runtime.*` still tunes movement/aggro |
| Status effects | [Status](https://irowiki.org/wiki/Status) | planned | — |
| Maps & warps | [Maps](https://irowiki.org/wiki/Category:Maps) | implemented | Tiled `.tmj`, `maps.json`, `prt_fild01`, **`prt_sewb1` Culvert** (`npm run maps:culvert`); NPC teleport warps |
| NPC Kafra storage | [Kafra](https://irowiki.org/wiki/Kafra) | implemented | `StorageModal.tsx`, `storage-transfer` function |
| Save point | — | implemented | `save-point` function |
| Player trade | [Trade](https://irowiki.org/wiki/Trade) | implemented | `TradeModal.tsx`, `trade-manage` function |
| NPC shops | [Vending](https://irowiki.org/wiki/Vending) | partial | `ShopModal.tsx`, `shop` NPC type — Tool / Weapon / Armor dealers in Prontera; buy allowed without reqs, equip gated (client-trusted zeny) |
| Healer NPC | — | implemented | `healer` NPC restores HP/SP to max (persisted on save) |
| NPC rentals (cart / peco / falcon) | [Equipment Rental](https://irowiki.org/wiki/Equipment_Rental) | partial | `rental` NPC, `content/ro/rentals.json`, `rental.ts`, `RentalModal.tsx`; timed rental in `character_progress.active_rental`; client-trusted zeny |
| Zeny economy | [Zeny](https://irowiki.org/wiki/Zeny) | partial | `characters.zeny`, trade, **auto zeny on mob kill** (`loot.json`, debounced save) |
| Party | [Party](https://irowiki.org/wiki/Party) | partial | `party-manage`, `PartyPanel`, click-target actions |
| Party dungeons | — | partial | `dungeon-manage`, `dun_f1`–`dun_f5`, Dungeon Guide NPC, per-party instances, MVP after clears, rolled gear drops (`content/ro/dungeons.json`) |
| Guild | [Guild](https://irowiki.org/wiki/Guild) | partial | `guild-manage`, `GuildModal`, tag on HUD/presence |
| Player vending | [Vending](https://irowiki.org/wiki/Vending) | partial | `vendor-manage`, `VendorSetupModal` / `VendorShopModal` |
| Map / party chat | — | implemented | `MapChatChannel`, `ChatStrip` |
| Quests | [Quests](https://irowiki.org/wiki/Category:Quests) | planned | — |
| Cards / refine | [Cards](https://irowiki.org/wiki/Cards), [Refine](https://irowiki.org/wiki/Refine) | out_of_scope | Later milestone |
| PvP / WoE | [WoE](https://irowiki.org/wiki/War_of_Emperium) | out_of_scope | — |
| Pets / homunculus | [Pets](https://irowiki.org/wiki/Pet) | out_of_scope | — |

## Combat data policy (M3)

| Field | Source | Notes |
|-------|--------|--------|
| Mob HP / ATK / DEF / MDEF / element / size | `content/ro/mobs.json` wiki-oriented columns + `runtime.maxHp` / `runtime.attackDamage` | Used in `mobConfig` + `combat/damage.ts` |
| Mob EXP on kill | `wikiBaseExp` / `wikiJobExp` | Scaled by `VITE_MOB_EXP_MULTIPLIER` (`gameConfig.ts`) |
| Mob movement / aggro / respawn | `mobs.json` → `runtime.*` | Gameplay tuning until a balance pass |
| Player EXP curves | `content/ro/expTables.json` | rAthena Pre-Renewal tables (see file `sourceUrl`) |

## Progression persistence (M2)

- **`character_progress`** — levels/EXP, stats, job id, unspent points, HP/MP, skill bar, session inventory (JSONB), `active_rental` (JSONB)
- **`character_skills`** — `skill_id`, `level`
- **`character_equipment`** — RO slots → `item_id` (FK `items`)
- **`public.items`** — extended with `item_type`, `weight`, `equip_slot`, `metadata` (equippables seeded from content)
- Client: [`client/src/lib/characterProgress.ts`](../client/src/lib/characterProgress.ts)
- Transport (M2 vs map/trade realtime): [`PERSISTENCE_AND_REALTIME.md`](PERSISTENCE_AND_REALTIME.md)

**HP/MP:** Saved values restored on login (clamped to max). New rows use `NULL` HP/MP until first play → full heal once on load.

## Future Supabase alignment

- Optional `mob_spawns` / server drop validation keyed by `content/ro/mobs.json`.

## Content curation workflow

1. Open the matching iRO Wiki page (Pre-Renewal values).
2. Add or update a row in `content/ro/*.json`; set `sourceUrl` when helpful.
3. For new **skills** / **weapons**, run `npm run icons:skills` / `npm run icons:weapons` (see [`ASSET_ICONS.md`](ASSET_ICONS.md)).
4. Run `npm run content:validate` from the repo root (includes weapon icon check).
5. Gameplay modules should read data through `loadRoContent()` / bridged configs (`skillsConfig`, `equipmentConfig`, `mobConfig`) — avoid duplicating ids or stats in TypeScript.

## Related docs

- [`PRE_RENEWAL_FORMULAS.md`](PRE_RENEWAL_FORMULAS.md) — formula targets
- [`PERSISTENCE_AND_REALTIME.md`](PERSISTENCE_AND_REALTIME.md) — M2 HTTP save vs Supabase Realtime
- [`DECISIONS.md`](DECISIONS.md) — v1 architecture choices
- [`README.md`](../README.md) — run & deploy
