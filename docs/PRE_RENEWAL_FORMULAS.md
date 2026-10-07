# Pre-Renewal formulas (targets)

We align with **Pre-Renewal / Classic** iRO rules per [iRO Wiki](https://irowiki.org/). Values are curated into this repo over time; links below are the source of truth when implementing.

**Current milestone:** M3 — Pre-Renewal tables in `content/ro/expTables.json`; combat in `client/src/game/combat/damage.ts`.

## Level caps

| Track | Pre-Renewal cap | Wiki |
|-------|-----------------|------|
| Base level | 99 | [Experience](https://irowiki.org/wiki/Experience) |
| 1st job | 50 | [Classes](https://irowiki.org/wiki/Classes) |
| 2nd job | 50 | [Classes](https://irowiki.org/wiki/Classes) |

## Stat points

- Gain stat points on base level up (amount per level per wiki / classic tables).
- Cost to raise a stat increases with current stat value ([Stats](https://irowiki.org/wiki/Stats)).

**Today:** Stat point grants from `expTables.json` (`statPointsOnBaseLevelUp`); `statRaiseCost` matches wiki step cost.

## HP and SP (MP)

Classic max HP/SP depend on base level, job, VIT, INT, and job bonuses ([Stats](https://irowiki.org/wiki/Stats), job pages).

**Today:** Job base HP/SP tables (`expTables.json`) + VIT×5 / INT×2 (default HpIncrease/SpIncrease).

## Experience tables

Base and job EXP to next level use large lookup tables in Pre-Renewal ([Experience](https://irowiki.org/wiki/Experience)).

**Today:** `content/ro/expTables.json` wired through `client/src/content/ro/expTables.ts` and `combat/exp.ts`.

## Skill points

Typically 1 skill point per job level ([Skills](https://irowiki.org/wiki/Skills)).

**Today:** `SKILL_POINTS_PER_JOB_LEVEL = 1` (matches classic simplification).

## Combat (planned)

Implement in order:

1. **HIT / FLEE** — hit chance from DEX, LUK, level, weapon ([Damage](https://irowiki.org/wiki/Damage)).
2. **ATK / DEF** — weapon ATK, hard/soft DEF, vit reduction ([Damage](https://irowiki.org/wiki/Damage)).
3. **Elements & size** — from mob/item data in `mobs.json` / `items.json` ([Element](https://irowiki.org/wiki/Element), [Size](https://irowiki.org/wiki/Size)).
4. **Status** — buffs/debuffs ([Status](https://irowiki.org/wiki/Status)).

**Today:** `combat/damage.ts` — HIT/FLEE, soft DEF + VIT reduction, element/size modifiers; mob ATK from `mobs.json`.

## Attack speed (ASPD)

Classic Pre-Renewal display ASPD (0–190) per [iRO Wiki Classic — ASPD](https://irowiki.org/classic/ASPD):

- `WD = 50 × BTBA` where BTBA comes from job + weapon class (`content/ro/aspd.json`, stored as `baseAspdAt1Agi1Dex` at 1 AGI / 1 DEX).
- `ASPD = 200 − (WD − round((WD×AGI/25 + WD×DEX/100) / 10)) × (1 − SM)`; `SM` = skill/potion IAS (0 until buffs wire in).
- Shield: subtract per-job `shieldAspdPenalty` from display ASPD when `offhandKind: "shield"` is equipped.
- Client attack interval: `(200 − floor(ASPD)) / 50` seconds between attacks (min 200ms).

**Today:** `client/src/game/combat/preRenewalAspd.ts`, `WorldScene` attack gating, Status window via `combatStatPreview.ts`.

## Critical hits

Inspired by [iRO Wiki Classic — Attacks](https://irowiki.org/classic/Attacks); **custom** chance and LUK scaling:

- **Chance:** Sum of equipped `combatBonuses.critChance` (items + rolled `critChance` effects) − `floor(targetLUK/5)`. No crit without gear (0% base).
- **Order:** Crit before hit/miss; crit always connects (ignores FLEE).
- **Damage:** `1.4 + floor(LUK/3)×0.01` on post-DEF (or post-MDEF) damage; physical crit ignores DEF; magic crit ignores MDEF and uses max MATK.

**Custom:** Bash and offensive magic use the same crit roll.

**Today:** `critBonuses.ts`, `calcCritDamageMultiplier`, `calcPlayerVsMobDamage`, `calcPlayerMagicVsMobDamage` in `client/src/game/combat/damage.ts`.

## Mob EXP

Kill reward uses mob base EXP and job EXP from data ([Poring](https://irowiki.org/wiki/Poring) and other mob pages).

**Today:** Kills award `wikiBaseExp` / `wikiJobExp` (optional env multiplier).

## Implementation checklist

- [x] `expTables.json` + wire `exp.ts`
- [x] Pre-Renewal stat point cost + grants
- [x] Job-aware HP/SP (novice table; extend per job in content as needed)
- [x] HIT/FLEE and damage pipeline in combat
- [x] LUK-based critical hits (physical + magic helper)
- [x] Drops from `mobs.json` `drops[]`
- [x] Classic Pre-Renewal ASPD (`aspd.json`, `preRenewalAspd.ts`)
