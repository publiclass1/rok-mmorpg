# Generated asset icons

## Weapon inventory SVGs

| | |
|--|--|
| **Generator** | [`scripts/generate-weapon-icons.mjs`](../scripts/generate-weapon-icons.mjs) |
| **Output** | [`client/public/items/weapons/`](../client/public/items/weapons/) |
| **Driven by** | [`content/ro/items.json`](../content/ro/items.json) — every row with `type: "weapon"` |

## Skill bar SVGs

| | |
|--|--|
| **Generator** | [`scripts/generate-skill-icons.mjs`](../scripts/generate-skill-icons.mjs) |
| **Output** | [`client/public/skills/`](../client/public/skills/) |
| **Driven by** | [`content/ro/skills.json`](../content/ro/skills.json) — one icon per skill id (or `iconFile` basename) |

### Commands (repo root)

```bash
npm run icons:skills        # regenerate all skill SVGs
npm run icons:skills:check  # CI / content:validate — ensure files exist
npm run icons:weapons       # regenerate weapon SVGs
npm run icons:weapons:check
npm run icons               # both generators
```

### Adding a new skill

1. Add the row to `content/ro/skills.json`.
2. Add a `builders[skillId]` draw function in `generate-skill-icons.mjs` (detailed 32×32 art).
3. Run `npm run icons:skills`.
4. Run `npm run content:validate`.

Runtime: `skillIconUrl()` → `/skills/{id}.svg` unless `iconFile` is set on the skill row.

### Adding a new weapon

1. Add the item to `content/ro/items.json` (`type`, `weaponClass`, etc.).
2. Optionally add a dedicated `builders[itemId]` in `generate-weapon-icons.mjs`; otherwise `weaponClass` templates apply.
3. Run `npm run icons:weapons`.
4. Run `npm run content:validate`.

Runtime: `getItemIconUrl()` → `/items/weapons/{id}.svg` unless `iconFile` is set on the item row.
