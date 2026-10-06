# Pre-Renewal formulas (targets)

We align with **Pre-Renewal / Classic** iRO rules per [iRO Wiki](https://irowiki.org/). Values are curated into this repo over time; links below are the source of truth when implementing.

**Current milestone:** data + docs only. Runtime still uses simplified formulas in `client/src/game/character/statFormulas.ts` and `client/src/game/combat/exp.ts`.

## Level caps

| Track | Pre-Renewal cap | Wiki |
|-------|-----------------|------|
| Base level | 99 | [Experience](https://irowiki.org/wiki/Experience) |
| 1st job | 50 | [Classes](https://irowiki.org/wiki/Classes) |
| 2nd job | 50 | [Classes](https://irowiki.org/wiki/Classes) |

## Stat points

- Gain stat points on base level up (amount per level per wiki / classic tables).
- Cost to raise a stat increases with current stat value ([Stats](https://irowiki.org/wiki/Stats)).

**Today:** `STAT_POINTS_PER_BASE_LEVEL = 3`, `statRaiseCost` in `statFormulas.ts` (custom).

**Target:** Replace with Pre-Renewal stat point grants and per-stat cost table.

## HP and SP (MP)

Classic max HP/SP depend on base level, job, VIT, INT, and job bonuses ([Stats](https://irowiki.org/wiki/Stats), job pages).

**Today:** `derivedMaxHp`, `derivedMaxMp` (linear custom).

**Target:** Job-aware Pre-Renewal max HP/SP formulas.

## Experience tables

Base and job EXP to next level use large lookup tables in Pre-Renewal ([Experience](https://irowiki.org/wiki/Experience)).

**Today:** `baseExpToNext` / `jobExpToNext` linear functions in `exp.ts`.

**Target:** Embed Pre-Renewal tables in `content/ro/` (e.g. `expTables.json`) and use in `exp.ts`.

## Skill points

Typically 1 skill point per job level ([Skills](https://irowiki.org/wiki/Skills)).

**Today:** `SKILL_POINTS_PER_JOB_LEVEL = 1` (matches classic simplification).

## Combat (planned)

Implement in order:

1. **HIT / FLEE** — hit chance from DEX, LUK, level, weapon ([Damage](https://irowiki.org/wiki/Damage)).
2. **ATK / DEF** — weapon ATK, hard/soft DEF, vit reduction ([Damage](https://irowiki.org/wiki/Damage)).
3. **Elements & size** — from mob/item data in `mobs.json` / `items.json` ([Element](https://irowiki.org/wiki/Element), [Size](https://irowiki.org/wiki/Size)).
4. **Status** — buffs/debuffs ([Status](https://irowiki.org/wiki/Status)).

**Today:** Flat `derivedAttackDamage`, mob `attackDamage`, no miss or elements.

## Mob EXP

Kill reward uses mob base EXP and job EXP from data ([Poring](https://irowiki.org/wiki/Poring) and other mob pages).

**Today:** `content/ro/mobs.json` carries wiki-oriented EXP fields; runtime uses `runtime.baseExp` / `runtime.jobExp` matching current gameplay.

## Implementation checklist

- [ ] `expTables.json` + wire `exp.ts`
- [ ] Pre-Renewal stat point cost + grants
- [ ] Job-aware HP/SP
- [ ] HIT/FLEE and damage pipeline in combat
- [ ] Drops from `mobs.json` `drops[]`
