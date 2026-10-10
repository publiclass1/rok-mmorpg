/**
 * Armor and consumable inventory SVG generator (32×32).
 *
 * Source: `content/ro/items.json` (type === "armor" | "consumable").
 * Output: `client/public/items/armor/{id}.svg`, `client/public/items/consumables/{id}.svg`
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { layerHex, safeGradientId, wrap } from './lib/roItemIconFrame.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ITEMS_PATH = path.join(REPO_ROOT, 'content/ro/items.json')
const armorDir = path.join(REPO_ROOT, 'client/public/items/armor')
const consumableDir = path.join(REPO_ROOT, 'client/public/items/consumables')

function drawCottonShirt(id, color) {
  return wrap(
    `
  <path d="M10 9 L16 7 L22 9 L24 14 L22 26 H10 L8 14 Z" fill="${color}"/>
  <path d="M10 9 L16 12 L22 9" stroke="#d6d3d1" stroke-width="0.5" fill="none"/>
  <path d="M16 7 V12" stroke="#a8a29e" stroke-width="0.4"/>
  <path d="M8 14 L10 16 M24 14 L22 16" stroke="#78716c" stroke-width="0.6"/>
  `,
    id,
    '#d6d3d1',
  )
}

function drawAdventurersSuit(id, color) {
  return wrap(
    `
  <path d="M9 10 L16 8 L23 10 L25 15 L23 26 H9 L7 15 Z" fill="${color}"/>
  <path d="M9 14 H23" stroke="#3f6212" stroke-width="0.5"/>
  <rect x="14" y="14" width="4" height="6" rx="0.5" fill="#4d7c0f" opacity="0.5"/>
  <path d="M7 15 L9 17 M25 15 L23 17" stroke="#365314" stroke-width="0.6"/>
  `,
    id,
    '#65a30d',
  )
}

function drawSilkRobe(id, color) {
  return wrap(
    `
  <path d="M11 8 L16 6 L21 8 L23 26 H9 L11 8 Z" fill="${color}"/>
  <path d="M11 8 Q16 14 21 8" stroke="#c4b5fd" stroke-width="0.6" fill="none"/>
  <path d="M13 10 L19 10" stroke="#a78bfa" stroke-width="0.4"/>
  <ellipse cx="16" cy="7" rx="3" ry="1" fill="#ede9fe" opacity="0.6"/>
  `,
    id,
    '#a78bfa',
  )
}

function drawWoodenMail(id, color) {
  return wrap(
    `
  <path d="M10 9 L16 7 L22 9 L23 26 H9 L10 9 Z" fill="url(#${id}-wood)"/>
  <path d="M10 12 H22 M10 16 H22 M10 20 H22" stroke="#292524" stroke-width="0.5" opacity="0.4"/>
  <path d="M12 9 L12 26 M16 7 L16 26 M20 9 L20 26" stroke="${color}" stroke-width="0.35" opacity="0.5"/>
  `,
    id,
    '#92400e',
  )
}

function drawCoat(id, color) {
  return wrap(
    `
  <path d="M9 10 L16 8 L23 10 L24 27 H8 L9 10 Z" fill="${color}"/>
  <path d="M16 8 L16 27" stroke="#1f2937" stroke-width="0.6"/>
  <path d="M9 10 L16 13 L23 10" stroke="#4b5563" stroke-width="0.5" fill="none"/>
  <rect x="14" y="16" width="4" height="5" rx="0.5" fill="#1f2937" opacity="0.3"/>
  `,
    id,
    '#374151',
  )
}

function drawCap(id, color) {
  return wrap(
    `
  <ellipse cx="16" cy="20" rx="9" ry="3" fill="${color}" opacity="0.9"/>
  <path d="M8 20 Q16 6 24 20" fill="${color}"/>
  <path d="M10 19 Q16 10 22 19" fill="#a16207" opacity="0.35"/>
  <ellipse cx="16" cy="20" rx="8" ry="1.5" fill="#292524" opacity="0.2"/>
  `,
    id,
    '#8b4513',
  )
}

function drawHelm(id) {
  return wrap(
    `
  <path d="M9 22 Q16 6 23 22 Z" fill="url(#${id}-steel)"/>
  <path d="M10 20 Q16 9 22 20" fill="#94a3b8" opacity="0.35"/>
  <rect x="8" y="21" width="16" height="3" rx="1" fill="#57534e"/>
  <path d="M11 14 H21" stroke="#334155" stroke-width="0.5"/>
  <rect x="14" y="18" width="4" height="2" fill="#1f2937" opacity="0.5"/>
  `,
    id,
    '#4b5563',
  )
}

function drawGoggles(id) {
  return wrap(
    `
  <path d="M8 16 H24" stroke="#57534e" stroke-width="1.2"/>
  <circle cx="12" cy="16" r="4" fill="#1f2937" opacity="0.8"/>
  <circle cx="20" cy="16" r="4" fill="#1f2937" opacity="0.8"/>
  <circle cx="12" cy="16" r="2.5" fill="#38bdf8" opacity="0.5"/>
  <circle cx="20" cy="16" r="2.5" fill="#38bdf8" opacity="0.5"/>
  <circle cx="11.2" cy="15.2" r="0.8" fill="#fff" opacity="0.4"/>
  <circle cx="19.2" cy="15.2" r="0.8" fill="#fff" opacity="0.4"/>
  `,
    id,
    '#374151',
  )
}

function drawCirclet(id, color) {
  return wrap(
    `
  <path d="M9 17 Q16 10 23 17" stroke="url(#${id}-gold)" stroke-width="2" fill="none"/>
  <circle cx="16" cy="14" r="2" fill="${color}"/>
  <circle cx="16" cy="14" r="1" fill="#fff" opacity="0.5"/>
  <path d="M11 17 H21" stroke="#d97706" stroke-width="0.5" opacity="0.6"/>
  `,
    id,
    '#fcd34d',
  )
}

function drawFluMask(id, color) {
  return wrap(
    `
  <path d="M10 14 Q16 10 22 14 L21 22 Q16 25 11 22 Z" fill="${color}"/>
  <path d="M12 17 H20" stroke="#d1d5db" stroke-width="0.5"/>
  <ellipse cx="13.5" cy="18" rx="1.5" ry="1" fill="#94a3b8" opacity="0.4"/>
  <ellipse cx="18.5" cy="18" rx="1.5" ry="1" fill="#94a3b8" opacity="0.4"/>
  <path d="M10 14 L8 16 M22 14 L24 16" stroke="#9ca3af" stroke-width="0.6"/>
  `,
    id,
    '#e5e7eb',
  )
}

function drawMask(id, color) {
  return wrap(
    `
  <path d="M10 13 Q16 9 22 13 L21 21 Q16 24 11 21 Z" fill="${color}"/>
  <ellipse cx="13" cy="17" rx="2" ry="2.5" fill="#111827" opacity="0.7"/>
  <ellipse cx="19" cy="17" rx="2" ry="2.5" fill="#111827" opacity="0.7"/>
  <path d="M14 20 Q16 21 18 20" stroke="#1f2937" stroke-width="0.5" fill="none"/>
  `,
    id,
    '#374151',
  )
}

function drawWoodenShield(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="10" fill="url(#${id}-wood)"/>
  <circle cx="16" cy="16" r="8" fill="none" stroke="#292524" stroke-width="0.5" opacity="0.4"/>
  <circle cx="16" cy="16" r="2.5" fill="url(#${id}-gold)"/>
  <path d="M16 6 L16 26 M6 16 L26 16" stroke="#451a03" stroke-width="0.4" opacity="0.35"/>
  `,
    id,
    '#a16207',
  )
}

function drawBuckler(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="9" fill="url(#${id}-steel)"/>
  <circle cx="16" cy="16" r="7" fill="none" stroke="#475569" stroke-width="0.6"/>
  <circle cx="16" cy="16" r="2" fill="#334155"/>
  <path d="M16 8 L16 24 M8 16 L24 16" stroke="#64748b" stroke-width="0.35"/>
  `,
    id,
    '#6b7280',
  )
}

function drawHoodedMantle(id, color) {
  return wrap(
    `
  <path d="M8 12 Q16 6 24 12 L26 26 H6 L8 12 Z" fill="${color}"/>
  <path d="M10 12 Q16 8 22 12 L20 14 Q16 11 12 14 Z" fill="#1e1b4b" opacity="0.5"/>
  <circle cx="16" cy="13" r="2" fill="#312e81" opacity="0.6"/>
  `,
    id,
    '#4c1d95',
  )
}

function drawMantle(id, color) {
  return wrap(
    `
  <path d="M7 14 L16 10 L25 14 L24 26 H8 L7 14 Z" fill="${color}"/>
  <path d="M16 10 L16 26" stroke="#1e3a8a" stroke-width="0.4" opacity="0.5"/>
  <path d="M9 14 L16 17 L23 14" stroke="#3b82f6" stroke-width="0.4" fill="none" opacity="0.4"/>
  `,
    id,
    '#1e3a8a',
  )
}

function drawSandals(id, color) {
  return wrap(
    `
  <path d="M9 22 H23 V25 H9 Z" fill="${color}" rx="1"/>
  <path d="M11 22 V18 M21 22 V18" stroke="#78350f" stroke-width="1"/>
  <path d="M11 18 L16 16 L21 18" stroke="#92400e" stroke-width="0.8" fill="none"/>
  <ellipse cx="16" cy="24" rx="7" ry="1.5" fill="#292524" opacity="0.2"/>
  `,
    id,
    '#92400e',
  )
}

function drawShoes(id, color) {
  return wrap(
    `
  <path d="M8 21 H24 V26 H8 Z" fill="${color}"/>
  <path d="M10 21 Q12 17 16 17 Q20 17 22 21" fill="#111827" opacity="0.35"/>
  <rect x="9" y="23" width="14" height="1" fill="#4b5563" opacity="0.5"/>
  `,
    id,
    '#1f2937',
  )
}

function drawClip(id, color) {
  return wrap(
    `
  <path d="M12 10 L20 10 L19 22 L13 22 Z" fill="url(#${id}-gold)"/>
  <path d="M14 10 L18 10 L17.5 20 L14.5 20 Z" fill="${color}"/>
  <circle cx="16" cy="12" r="1.5" fill="#fef3c7"/>
  `,
    id,
    '#f59e0b',
  )
}

function drawGlove(id, color) {
  return wrap(
    `
  <path d="M12 10 H20 V18 Q20 22 16 22 Q12 22 12 18 Z" fill="${color}"/>
  <path d="M13 10 V7 H15 V10 M17 10 V6 H19 V10" stroke="#57534e" stroke-width="1.2"/>
  <path d="M14 15 H18" stroke="#44403c" stroke-width="0.4"/>
  `,
    id,
    '#78716c',
  )
}

function drawRing(id, color) {
  return wrap(
    `
  <ellipse cx="16" cy="18" rx="6" ry="5" fill="none" stroke="url(#${id}-gold)" stroke-width="2"/>
  <circle cx="16" cy="14" r="2.5" fill="${color}"/>
  <circle cx="15.2" cy="13.2" r="0.8" fill="#fff" opacity="0.55"/>
  `,
    id,
    '#eab308',
  )
}

function drawRedPotion(id) {
  return drawTintedPotion(id, '#dc2626', '#991b1b', '#ef4444', '#ef4444')
}

function drawBluePotion(id) {
  return drawTintedPotion(id, '#1d4ed8', '#1e3a8a', '#3b82f6', '#3b82f6')
}

function drawTintedPotion(id, fill, shadow, highlight, glow) {
  return wrap(
    `
  <path d="M13 10 H19 V11 H13 Z" fill="#94a3b8"/>
  <rect x="13" y="11" width="6" height="2" fill="#64748b"/>
  <path d="M12 13 H20 L19 26 H13 L12 13 Z" fill="${fill}"/>
  <path d="M13 14 L14 25 H18 L19 14" fill="${highlight}" opacity="0.5"/>
  <rect x="14" y="16" width="4" height="6" fill="#fff" opacity="0.15" rx="0.5"/>
  <ellipse cx="16" cy="26" rx="4" ry="1" fill="${shadow}"/>
  `,
    id,
    glow,
  )
}

function consumableBuilderForItemId(itemId) {
  if (consumableBuilders[itemId]) return consumableBuilders[itemId]
  if (itemId.startsWith('aspd_potion_')) {
    return (id) => drawTintedPotion(id, '#ca8a04', '#713f12', '#facc15', '#eab308')
  }
  if (itemId.startsWith('atk_potion_')) {
    return (id) => drawTintedPotion(id, '#b91c1c', '#7f1d1d', '#f87171', '#ef4444')
  }
  if (itemId.startsWith('matk_potion_')) {
    return (id) => drawTintedPotion(id, '#6d28d9', '#4c1d95', '#a78bfa', '#8b5cf6')
  }
  if (itemId.startsWith('def_potion_')) {
    return (id) => drawTintedPotion(id, '#15803d', '#14532d', '#4ade80', '#22c55e')
  }
  if (itemId.startsWith('mdef_potion_')) {
    return (id) => drawTintedPotion(id, '#0e7490', '#164e63', '#22d3ee', '#06b6d4')
  }
  return consumableBuilders[baseGearIconId(itemId)]
}

const armorBuilders = {
  cotton_shirt: (id, item) => drawCottonShirt(id, layerHex(item.layerColor)),
  adventurers_suit: (id, item) => drawAdventurersSuit(id, layerHex(item.layerColor)),
  silk_robe: (id, item) => drawSilkRobe(id, layerHex(item.layerColor)),
  wooden_mail: (id, item) => drawWoodenMail(id, layerHex(item.layerColor)),
  coat: (id, item) => drawCoat(id, layerHex(item.layerColor)),
  cap: (id, item) => drawCap(id, layerHex(item.layerColor)),
  helm: (id) => drawHelm(id),
  goggles: (id) => drawGoggles(id),
  circlet: (id, item) => drawCirclet(id, layerHex(item.layerColor)),
  flu_mask: (id, item) => drawFluMask(id, layerHex(item.layerColor)),
  mask: (id, item) => drawMask(id, layerHex(item.layerColor)),
  wooden_shield: (id) => drawWoodenShield(id),
  buckler: (id) => drawBuckler(id),
  hooded_mantle: (id, item) => drawHoodedMantle(id, layerHex(item.layerColor)),
  mantle: (id, item) => drawMantle(id, layerHex(item.layerColor)),
  sandals: (id, item) => drawSandals(id, layerHex(item.layerColor)),
  shoes: (id, item) => drawShoes(id, layerHex(item.layerColor)),
  clip: (id, item) => drawClip(id, layerHex(item.layerColor)),
  glove: (id, item) => drawGlove(id, layerHex(item.layerColor)),
  ring: (id, item) => drawRing(id, layerHex(item.layerColor)),
  padded_vest: (id, item) => drawCoat(id, layerHex(item.layerColor)),
  scout_mail: (id, item) => drawCoat(id, layerHex(item.layerColor)),
  knight_plate: (id, item) => drawCoat(id, layerHex(item.layerColor)),
  violet_cuirass: (id, item) => drawCoat(id, layerHex(item.layerColor)),
  dragon_scale_mail: (id, item) => drawCoat(id, layerHex(item.layerColor)),
  skyweave_robe: (id, item) => drawSilkRobe(id, layerHex(item.layerColor)),
  relic_guardplate: (id, item) => drawWoodenMail(id, layerHex(item.layerColor)),
}

const consumableBuilders = {
  red_potion: (id) => drawRedPotion(id),
  blue_potion: (id) => drawBluePotion(id),
}

function baseGearIconId(itemId) {
  if (itemId.startsWith('rarity_cos_')) return itemId.slice('rarity_cos_'.length)
  return itemId
}

function loadGearItems() {
  const pack = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'))
  const items = pack.items ?? []
  return items.filter((i) => i.type === 'armor' || i.type === 'consumable')
}

function outPathForItem(item) {
  if (item.type === 'armor') return path.join(armorDir, `${item.id}.svg`)
  if (item.type === 'consumable') return path.join(consumableDir, `${item.id}.svg`)
  return null
}

function runCheck() {
  const gear = loadGearItems()
  const missing = gear.filter((g) => {
    const p = outPathForItem(g)
    return !p || !fs.existsSync(p)
  })
  if (missing.length > 0) {
    console.error(`[icons:gear] missing SVG for: ${missing.map((g) => g.id).join(', ')}`)
    console.error('Run: npm run icons:gear')
    process.exit(1)
  }
  console.log(`[icons:gear] OK — ${gear.length} gear icons present`)
}

function cleanStale(dir, expectedIds) {
  if (!fs.existsSync(dir)) return
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.svg')) continue
    const id = file.slice(0, -4)
    if (!expectedIds.has(id)) {
      fs.unlinkSync(path.join(dir, file))
      console.log(`[icons:gear] removed stale ${path.basename(dir)}/${file}`)
    }
  }
}

function runGenerate() {
  const gear = loadGearItems()
  const expectedArmor = new Set(gear.filter((g) => g.type === 'armor').map((g) => g.id))
  const expectedConsumable = new Set(gear.filter((g) => g.type === 'consumable').map((g) => g.id))

  fs.mkdirSync(armorDir, { recursive: true })
  fs.mkdirSync(consumableDir, { recursive: true })

  for (const item of gear) {
    const gid = safeGradientId(item.id)
    let svg
    if (item.type === 'armor') {
      const build = armorBuilders[item.id] ?? armorBuilders[baseGearIconId(item.id)]
      if (!build) {
        console.error(`[icons:gear] no armor builder for "${item.id}"`)
        process.exit(1)
      }
      svg = build(gid, item)
    } else {
      const build = consumableBuilderForItemId(item.id)
      if (!build) {
        console.error(`[icons:gear] no consumable builder for "${item.id}"`)
        process.exit(1)
      }
      svg = build(gid)
    }
    fs.writeFileSync(outPathForItem(item), svg)
  }

  cleanStale(armorDir, expectedArmor)
  cleanStale(consumableDir, expectedConsumable)

  console.log(`[icons:gear] wrote ${gear.length} icons → armor/ + consumables/`)
}

if (process.argv.includes('--check')) {
  runCheck()
} else {
  runGenerate()
}
