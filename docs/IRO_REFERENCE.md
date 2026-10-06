# iRO Wiki design reference (Pre-Renewal)

This project uses [iRO Wiki](https://irowiki.org/) as the **canonical design reference** for systems, names, and Pre-Renewal / Classic rules. Gameplay data lives in [`content/ro/`](../content/ro/); runtime code loads it via [`client/src/content/ro/loadContent.ts`](../client/src/content/ro/loadContent.ts).

**Ruleset:** Pre-Renewal (not Renewal). See [`PRE_RENEWAL_FORMULAS.md`](PRE_RENEWAL_FORMULAS.md) for formulas we intend to port.

**Execution order:** [`MILESTONES.md`](MILESTONES.md) — M1 done; work through M2–M6 one at a time.

## Custom rules (this game ≠ vanilla iRO)

| Topic | Choice |
|-------|--------|
| Client | Vite + React UI, Phaser 4 world, Netlify static host |
| Movement | Click-to-walk + jump (not classic RO keyboard-only) |
| Progression persistence | Base/job/stats/skills/equip/HP are **session-only** in the client today; DB stores position, zeny, stack inventory |
| Equipment slots | RO-style slots in data (`headTop`, `offhand`, etc.); UI may show a subset |
| Authority | Supabase Edge Functions validate storage, save point, warp, trade; combat/loot are client-trusted until a later milestone |
| Content pipeline | Manual curation from wiki (no scraping); optional `sourceUrl` per row in JSON |

## System status matrix

| System | Wiki | Status | Code / data |
|--------|------|--------|-------------|
| Accounts & characters | — | implemented | `client/src/lib/accountAuth.ts`, `supabase/migrations/*` |
| Stats (STR–LUK) | [Stats](https://irowiki.org/wiki/Stats) | partial | `characterState.ts`, `statFormulas.ts` (custom costs/derivatives) |
| Base / job EXP | [Experience](https://irowiki.org/wiki/Experience) | partial | `combat/exp.ts` (custom tables; target Pre-Renewal curves) |
| Jobs & job change | [Classes](https://irowiki.org/wiki/Classes) | partial | `content/ro/jobs.json` (Novice + 1st-job stubs); runtime: Novice only |
| Skills | [Skills](https://irowiki.org/wiki/Skills) | partial | `content/ro/skills.json`; placeholders for Bash/Magnum/Heal |
| Items & equipment | [Items](https://irowiki.org/wiki/Items), [Equipment](https://irowiki.org/wiki/Equipment) | partial | `content/ro/items.json`, `equipmentConfig.ts` |
| Inventory weight | [Weight](https://irowiki.org/wiki/Weight) | planned | — |
| Monsters & drops | [Monsters](https://irowiki.org/wiki/Monsters) | partial | `content/ro/mobs.json`, `mobConfig.ts` |
| Combat & damage | [Damage](https://irowiki.org/wiki/Damage) | partial | `WorldScene.ts` (flat ATK; no HIT/FLEE/elements yet) |
| Status effects | [Status](https://irowiki.org/wiki/Status) | planned | — |
| Maps & warps | [Maps](https://irowiki.org/wiki/Category:Maps) | partial | Tiled maps, `content/ro/maps.json`, NPC teleport |
| NPC Kafra storage | [Kafra](https://irowiki.org/wiki/Kafra) | implemented | `StorageModal.tsx`, `storage-transfer` function |
| Save point | — | implemented | `save-point` function |
| Player trade | [Trade](https://irowiki.org/wiki/Trade) | implemented | `TradeModal.tsx`, `trade-manage` function |
| NPC shops | [Vending](https://irowiki.org/wiki/Vending) | planned | — |
| Zeny economy | [Zeny](https://irowiki.org/wiki/Zeny) | partial | `characters.zeny`, trade |
| Party | [Party](https://irowiki.org/wiki/Party) | planned | — |
| Guild | [Guild](https://irowiki.org/wiki/Guild) | planned | — |
| Quests | [Quests](https://irowiki.org/wiki/Category:Quests) | planned | — |
| Cards / refine | [Cards](https://irowiki.org/wiki/Cards), [Refine](https://irowiki.org/wiki/Refine) | out_of_scope | Later milestone |
| PvP / WoE | [WoE](https://irowiki.org/wiki/War_of_Emperium) | out_of_scope | — |
| Pets / homunculus | [Pets](https://irowiki.org/wiki/Pet) | out_of_scope | — |

## Future Supabase alignment (not migrated yet)

When progression is persisted:

- Extend `public.items` with `item_type`, `weight`, `equip_slot`, and/or `metadata jsonb` synced from `content/ro/items.json`.
- Add `character_progress` (base/job level, EXP, stats, job id).
- Add `character_skills` and `character_equipment` (or JSONB on `characters`).
- Optional `mob_spawns` / server drop validation keyed by `content/ro/mobs.json`.

## Content curation workflow

1. Open the matching iRO Wiki page (Pre-Renewal values).
2. Add or update a row in `content/ro/*.json`; set `sourceUrl` when helpful.
3. Run `npm run content:validate` from the repo root.
4. Gameplay modules should read data through `loadRoContent()` / bridged configs (`skillsConfig`, `equipmentConfig`, `mobConfig`) — avoid duplicating ids or stats in TypeScript.

## Related docs

- [`PRE_RENEWAL_FORMULAS.md`](PRE_RENEWAL_FORMULAS.md) — formula targets
- [`DECISIONS.md`](DECISIONS.md) — v1 architecture choices
- [`README.md`](../README.md) — run & deploy
