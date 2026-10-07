# Generated asset icons

Shared frame helpers live in [`scripts/lib/roItemIconFrame.mjs`](../scripts/lib/roItemIconFrame.mjs) (`wrap`, gradients, slot border).

## Weapon inventory SVGs

| | |
|--|--|
| **Generator** | [`scripts/generate-weapon-icons.mjs`](../scripts/generate-weapon-icons.mjs) |
| **Output** | [`client/public/items/weapons/`](../client/public/items/weapons/) |
| **Driven by** | [`content/ro/items.json`](../content/ro/items.json) — every row with `type: "weapon"` |

## Armor and consumable inventory SVGs

| | |
|--|--|
| **Generator** | [`scripts/generate-gear-icons.mjs`](../scripts/generate-gear-icons.mjs) |
| **Output** | [`client/public/items/armor/`](../client/public/items/armor/), [`client/public/items/consumables/`](../client/public/items/consumables/) |
| **Driven by** | [`content/ro/items.json`](../content/ro/items.json) — `type: "armor"` or `type: "consumable"` |

### Gear icon motifs (wiki reference)

| Item id | Motif |
|---------|--------|
| `cotton_shirt`, `adventurers_suit`, `silk_robe`, `wooden_mail`, `coat` | Shirt / green suit / purple robe / plank mail / long coat |
| `cap`, `helm` | Soft cap vs metal helm |
| `goggles`, `circlet` | Lenses on strap vs gold circlet |
| `flu_mask`, `mask` | White surgical mask vs dark eye mask |
| `wooden_shield`, `buckler` | Round wood shield vs metal buckler |
| `hooded_mantle`, `mantle` | Hooded cloak vs blue shoulder cape |
| `sandals`, `shoes` | Strapped sandals vs enclosed shoes |
| `clip`, `glove`, `ring` | Hair clip, glove, gold ring |
| `red_potion` | Red glass flask |
| `blue_potion` | Blue glass flask |

**Phase 2 (not yet):** `type: "etc"` loot icons under `client/public/items/etc/` plus a generator branch in `getItemIconUrl`.

## Skill bar SVGs

| | |
|--|--|
| **Generator** | [`scripts/generate-skill-icons.mjs`](../scripts/generate-skill-icons.mjs) |
| **Output** | [`client/public/skills/`](../client/public/skills/) |
| **Driven by** | [`content/ro/skills.json`](../content/ro/skills.json) — one icon per skill id (or `iconFile` basename) |

### RO-inspired illustrated SVG (Pre-Renewal)

Icons are **original vector art** (gradients + paths) in a 32×32 `viewBox`, styled after classic iRO skill **motifs** (see each skill’s `sourceUrl` on the wiki). Do **not** bundle ripped client GRF bitmaps.

| Rule | Detail |
|------|--------|
| Canvas | 32×32; plum slot background + thin metallic border (shared `frame()` in generator) |
| Art | Per-skill `draw*` functions with shared steel / gold / fire / holy gradients |
| Mob skills | `mob_*` ids use purple-tinted variants of player motifs |
| Regen | Always edit `scripts/generate-skill-icons.mjs`, then `npm run icons:skills` — do not hand-edit `client/public/skills/*.svg` |

### Skill icon motifs (wiki reference)

| Skill id | Wiki | Motif |
|----------|------|--------|
| `basic_attack` | — | Blade + gauntlet strike |
| `sit` | [Sit](https://irowiki.org/wiki/Sit) | Seated character on bench |
| `sword_mastery` | [Sword Mastery](https://irowiki.org/wiki/Sword_Mastery) | Crossed swords |
| `bash` | [Bash](https://irowiki.org/wiki/Bash) | Sword + impact sparks |
| `provoke` | [Provoke](https://irowiki.org/wiki/Provoke) | Rage face + veins |
| `endure` | [Endure](https://irowiki.org/wiki/Endure) | Steel shield |
| `magnum` | [Magnum Break](https://irowiki.org/wiki/Magnum_Break) | Fire ring + sword |
| `hp_recovery` | [Increase HP Recovery](https://irowiki.org/wiki/Increase_HP_Recovery) | Heart + green cross |
| `spear_mastery` | [Spear Mastery](https://irowiki.org/wiki/Spear_Mastery) | Spear + mastery marks |
| `pierce` | [Pierce](https://irowiki.org/wiki/Pierce) | Thrusting spear + pierce line |
| `brandish_spear` | [Brandish Spear](https://irowiki.org/wiki/Brandish_Spear) | Spin arc + spear |
| `spear_stab` | [Spear Stab](https://irowiki.org/wiki/Spear_Stab) | Forward stab |
| `spear_boomerang` | [Spear Boomerang](https://irowiki.org/wiki/Spear_Boomerang) | Arc + thrown spear |
| `twohand_quicken` | [Two-Hand Quicken](https://irowiki.org/wiki/Two-Hand_Quicken) | Twin blades + speed lines |
| `counter_attack` | [Counter Attack](https://irowiki.org/wiki/Counter_Attack) | Shield + counter spark |
| `bowling_bash` | [Bowling Bash](https://irowiki.org/wiki/Bowling_Bash) | Sword + bowling pins |
| `riding` | [Riding](https://irowiki.org/wiki/Riding) | Saddle |
| `cavalier_mastery` | [Cavalier Mastery](https://irowiki.org/wiki/Cavalier_Mastery) | Lance + mounted knight |
| `peco_peco_ride` | [Peco Peco Ride](https://irowiki.org/wiki/Peco_Peco_Ride) | Peco Peco mount |
| `pushcart` | [Pushcart](https://irowiki.org/wiki/Pushcart) | Merchant cart + wheels |
| `falcon_mastery` | [Falcon Mastery](https://irowiki.org/wiki/Falcon_Mastery) | Falcon head / wings |
| `heal` | [Heal](https://irowiki.org/wiki/Heal) | Golden holy cross |
| `mob_bash` | — | Purple-tinted bash |
| `mob_hammer_fall` | — | Purple hammer |
| `mob_meteor_storm` | — | Meteors + fire |
| `mob_dark_strike` | — | Dark crystal strike |
| `mob_pulse_strike` | — | Cyan pulse rings |

### Commands (repo root)

```bash
npm run icons:skills        # regenerate all skill SVGs
npm run icons:skills:check  # CI / content:validate — ensure files exist
npm run icons:weapons       # regenerate weapon SVGs
npm run icons:weapons:check
npm run icons:gear          # armor + consumable SVGs
npm run icons:gear:check
npm run icons               # weapons + gear + skills
```

### Adding a new skill

1. Add the row to `content/ro/skills.json`.
2. Add a `builders[skillId]` draw function in `generate-skill-icons.mjs` (vector art inside the shared RO slot frame).
3. Run `npm run icons:skills`.
4. Run `npm run content:validate`.

Runtime: `skillIconUrl()` → `/skills/{id}.svg` unless `iconFile` is set on the skill row.

### Adding a new weapon

1. Add the item to `content/ro/items.json` (`type`, `weaponClass`, etc.).
2. Optionally add a dedicated `builders[itemId]` in `generate-weapon-icons.mjs`; otherwise `weaponClass` templates apply.
3. Run `npm run icons:weapons`.
4. Run `npm run content:validate`.

Runtime: `getItemIconUrl()` → `/items/weapons|armor|consumables/{id}.svg` by item `type`, unless `iconFile` is set on the item row.

### Adding armor or a consumable

1. Add the row to `content/ro/items.json`.
2. Add `armorBuilders[id]` or `consumableBuilders[id]` in `generate-gear-icons.mjs`.
3. Run `npm run icons:gear`.
4. Run `npm run content:validate`.
