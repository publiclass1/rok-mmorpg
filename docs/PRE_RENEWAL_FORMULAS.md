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

Classic max HP/SP depend on base level, job coefficients, VIT, and INT ([Max HP Classic](https://irowiki.org/classic/Max_HP), [Max SP Classic](https://irowiki.org/classic/Max_SP)).

- **Base HP:** `35 + baseLevel × HP_JOB_B` plus `Σ round(HP_JOB_A × i)` for `i = 2..baseLevel`
- **Max HP:** `floor(baseHp × (1 + VIT × 0.01) × TRANS_MOD)` (+ equipment mods when wired)
- **Base SP:** `10 + baseLevel × SP_JOB`
- **Max SP:** `floor(baseSp × (1 + INT × 0.01))`, then `× TRANS_MOD`
- **Base level up:** current HP/SP increase by the gain in max; stat points from `statPointsOnBaseLevelUp`
- **Job level up:** skill points only (max HP/SP unchanged until base level or job class changes)

**Today:** `hpJobA` / `hpJobB` / `spJob` on each job in `content/ro/jobs.json`; `statFormulas.ts` + `progressApply.ts` on all EXP paths. `expTables.json` `jobBaseHp`/`jobBaseSp` novice rows kept as reference for validation.

## Experience tables

Base and job EXP to next level use large lookup tables in Pre-Renewal ([Experience](https://irowiki.org/wiki/Experience)).

**Today:** `content/ro/expTables.json` wired through `client/src/content/ro/expTables.ts` and `combat/exp.ts`.

## Skill points

Typically 1 skill point per job level ([Skills](https://irowiki.org/wiki/Skills)).

**Today:** `SKILL_POINTS_PER_JOB_LEVEL = 1` (matches classic simplification).

## Job level bonuses (Renewal — hybrid exception)

Pre-Renewal does not grant automatic STR–LUK on job level; **Renewal** class pages list per-job-level bonuses ([Job Bonuses](https://irowiki.org/wiki/Category:Classes) tables on iRO Wiki).

- Cumulative bonuses for **current job only** at `jobLevel` (not persisted; not part of stat-point budget).
- Data: [`content/ro/jobBonuses.json`](../content/ro/jobBonuses.json); runtime: [`client/src/game/character/jobBonuses.ts`](../client/src/game/character/jobBonuses.ts) applied in `effectiveStats.ts`.
- Combat/EXP/ASPD remain Pre-Renewal; see [`IRO_REFERENCE.md`](IRO_REFERENCE.md).

## Cast time (variable)

Classic Pre-Renewal cast time scales with **DEX** ([Cast Time](https://irowiki.org/classic/Cast_Time)):

- `Cast = Base × (1 − DEX/130) × (1 − 0.15×SuffragiumLv) × (1 − x×0.01)` where `x` is sum of % reductions from gear/skills. (Divisor **130** is a project tuning choice; Classic wiki uses 150.)
- At DEX ≥ 130 the variable portion reaches 0 (instant cast phase; attack windup still applies).
- Skill rows store **base** cast in `castTimeMs` (milliseconds).

**Today:** `client/src/game/combat/castTime.ts` — DEX reduction wired in `WorldScene` strike delay and skill tooltips (`skillRequirements.ts`). Suffragium / gear % not wired yet.

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
- [x] Job-aware HP/SP (classic formulas + `jobs.json` vitals; level-up HP/SP gain on base level)
- [x] HIT/FLEE and damage pipeline in combat
- [x] LUK-based critical hits (physical + magic helper)
- [x] Drops from `mobs.json` `drops[]`
- [x] Classic Pre-Renewal ASPD (`aspd.json`, `preRenewalAspd.ts`)
- [x] Classic cast time vs DEX (`castTime.ts`, skill `castTimeMs` in content)
