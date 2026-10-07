/**
 * Standard inventory weapon SVG generator (32×32).
 *
 * Source of truth: `content/ro/items.json` (type === "weapon").
 * Output: `client/public/items/weapons/{id}.svg` (used by getItemIconUrl).
 *
 * Usage (repo root):
 *   npm run icons:weapons        — regenerate all weapon icons
 *   npm run icons:weapons:check  — fail if any weapon row lacks an SVG
 *
 * Custom art: add or override a entry in `builders` below for a specific item id.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { safeGradientId, wrap } from './lib/roItemIconFrame.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ITEMS_PATH = path.join(REPO_ROOT, 'content/ro/items.json')
const outDir = path.join(REPO_ROOT, 'client/public/items/weapons')

/** Straight one-handed sword */
function drawSword(id, opts = {}) {
  const { wide = false, long = false, tint = '#64748b' } = opts
  const bladeW = wide ? 5 : 4
  const bladeH = long ? 17 : 15
  const x = 16 - bladeW / 2
  const fuller = long
    ? `<path d="M16 7 L16 ${4 + bladeH}" stroke="#64748b" stroke-width="0.8" opacity="0.35"/>`
    : ''
  return wrap(
    `
  <path d="M${x} 5 L${x + bladeW} 5 L${x + bladeW - 0.5} ${5 + bladeH} L16 ${6 + bladeH + 2} L${x + 0.5} ${5 + bladeH} Z" fill="url(#${id}-steel)"/>
  <path d="M${x + 1} 6 L${x + bladeW - 1} 6 L${x + bladeW - 1.2} ${4 + bladeH} L16 ${5 + bladeH + 1} L${x + 1.2} ${4 + bladeH} Z" fill="#f1f5f9" opacity="0.45"/>
  <path d="M16 5 L16 ${5 + bladeH}" stroke="#475569" stroke-width="0.4" opacity="0.5"/>
  ${fuller}
  <rect x="11" y="${5 + bladeH}" width="10" height="2.5" rx="0.5" fill="url(#${id}-gold)"/>
  <rect x="10" y="${7 + bladeH}" width="12" height="1.5" fill="#57534e"/>
  <rect x="14.5" y="${8 + bladeH}" width="3" height="5" rx="0.5" fill="url(#${id}-leather)"/>
  <rect x="15" y="${8.5 + bladeH}" width="1" height="4" fill="#44403c" opacity="0.6"/>
  <circle cx="16" cy="${10.5 + bladeH}" r="1.8" fill="url(#${id}-gold)"/>
  <circle cx="16" cy="${10.5 + bladeH}" r="0.8" fill="#fef3c7" opacity="0.8"/>
  `,
    id,
    tint,
  )
}

function drawFalchion(id) {
  return wrap(
    `
  <path d="M11 7 C13 5 19 5 21 8 L22.5 19 C23 21.5 18 24 14 22.5 L10 11 Z" fill="url(#${id}-steel)"/>
  <path d="M12 8 C14 6.5 18 7 20 9 L21 18 C21.5 20 18 21.5 15.5 20.5 L11.5 12 Z" fill="#f8fafc" opacity="0.35"/>
  <path d="M14 9 Q18 10 19 14 Q17 18 15 17" stroke="#94a3b8" stroke-width="0.6" fill="none" opacity="0.5"/>
  <rect x="11" y="21" width="9" height="2" fill="url(#${id}-gold)"/>
  <rect x="13" y="23" width="5" height="4" fill="url(#${id}-leather)"/>
  <circle cx="15.5" cy="25.5" r="1.5" fill="url(#${id}-gold)"/>
  `,
    id,
    '#78716c',
  )
}

function drawRapier(id) {
  return wrap(
    `
  <path d="M15.2 4 L16.8 4 L16.5 22 L16 23 L15.5 22 Z" fill="url(#${id}-steel-dark)"/>
  <path d="M15.6 5 L16.2 5 L16 20" stroke="#f8fafc" stroke-width="0.6" opacity="0.7"/>
  <ellipse cx="16" cy="20.5" rx="5" ry="1.2" fill="url(#${id}-gold)" opacity="0.9"/>
  <path d="M10 20 H22 V21.2 H10 Z" fill="url(#${id}-gold)"/>
  <path d="M9 21 H23 V22 H9 Z" fill="#57534e"/>
  <circle cx="16" cy="24" r="2.2" fill="url(#${id}-gold)"/>
  <circle cx="16" cy="23.8" r="2.8" fill="none" stroke="#fde68a" stroke-width="0.4" opacity="0.6"/>
  <circle cx="15.3" cy="23.5" r="0.5" fill="#fff" opacity="0.5"/>
  `,
    id,
    '#94a3b8',
  )
}

function drawSaber(id) {
  return wrap(
    `
  <path d="M20 5 C23 9 24 15 20 21 C17 24 12 24 11 21 L13 7 C14 5 17 4 20 5 Z" fill="url(#${id}-steel)"/>
  <path d="M19 6 C21 9 22 14 19 19 C17 22 13 22 12.5 20 L14 8 C14.5 6 16 5 19 6 Z" fill="#e2e8f0" opacity="0.4"/>
  <path d="M18 7 L16 20" stroke="#b45309" stroke-width="0.5" opacity="0.4"/>
  <rect x="10" y="21" width="8" height="2" rx="0.5" fill="url(#${id}-gold)" transform="rotate(-12 14 22)"/>
  <rect x="11" y="23" width="5" height="4" fill="url(#${id}-leather)"/>
  `,
    id,
    '#b45309',
  )
}

function drawKnife(id, variant) {
  const extras = {
    knife: {
      blade: 'M17 6 L21 19 L15 21 L11 9 Z',
      guard: '',
      accent: '#6b7280',
    },
    main_gauche: {
      blade: 'M16 5 L20 18 L14 20 L10 8 Z',
      guard: `<path d="M9 17 L23 17 L22 19 L10 19 Z" fill="url(#${id}-gold)"/>`,
      accent: '#94a3b8',
    },
    dagger: {
      blade: 'M17 7 L20 17 L14 19 L12 10 Z',
      guard: `<path d="M11 18 H21 V19.5 H11 Z" fill="#57534e"/><path d="M10 17.5 H22 V18 H10 Z" fill="url(#${id}-gold)"/>`,
      accent: '#6b7280',
    },
    stiletto: {
      blade: 'M16 4 L17.5 4 L17 21 L15.5 21 Z',
      guard: `<circle cx="16" cy="21.5" r="2" fill="url(#${id}-gold)"/>`,
      accent: '#d1d5db',
    },
  }
  const cfg = extras[variant] ?? extras.knife
  const isStiletto = variant === 'stiletto'
  return wrap(
    `
  ${isStiletto ? `<path d="${cfg.blade}" fill="url(#${id}-steel-dark)"/>` : `<path d="${cfg.blade}" fill="url(#${id}-steel)"/>`}
  ${!isStiletto ? `<path d="${cfg.blade}" fill="#fff" opacity="0.2" transform="translate(-1,-1)"/>` : `<path d="M16.2 5 L16.8 5 L16.5 19" stroke="#f1f5f9" stroke-width="0.5"/>`}
  ${cfg.guard}
  <rect x="12" y="20" width="7" height="2.5" rx="0.5" fill="url(#${id}-gold)"/>
  <rect x="13" y="22.5" width="5" height="4" rx="1" fill="url(#${id}-leather)"/>
  <path d="M13.5 23 H17" stroke="#292524" stroke-width="0.5"/>
  `,
    id,
    cfg.accent,
  )
}

function drawSpear(id) {
  return wrap(
    `
  <path d="M8 26 L24 10" stroke="url(#${id}-wood)" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M8.5 25.5 L23.5 10.5" stroke="#d6d3d1" stroke-width="0.6" opacity="0.35"/>
  <path d="M9 24 L11 22 M11 21 L13 19" stroke="#292524" stroke-width="0.5" opacity="0.5"/>
  <path d="M22 9 L26 7 L24 12 L20 11 Z" fill="url(#${id}-steel)"/>
  <path d="M22.5 9.5 L25 8 L23.5 11 Z" fill="#e2e8f0" opacity="0.5"/>
  <path d="M23 8 L25 7.5 L24 10" stroke="#475569" stroke-width="0.3"/>
  `,
    id,
    '#38bdf8',
  )
}

function drawRod(id) {
  return wrap(
    `
  <rect x="14.5" y="10" width="3" height="18" rx="1" fill="url(#${id}-wood)"/>
  <path d="M15 12 H17 M15 15 H17 M15 18 H17" stroke="#292524" stroke-width="0.4" opacity="0.4"/>
  <circle cx="16" cy="8" r="4" fill="url(#${id}-gem)" filter="url(#${id}-glow)"/>
  <circle cx="15" cy="7" r="1.2" fill="#fff" opacity="0.55"/>
  <path d="M13 10 Q16 11 19 10" stroke="#7c3aed" stroke-width="0.5" opacity="0.6"/>
  `,
    id,
    '#a78bfa',
  )
}

function drawWand(id) {
  return wrap(
    `
  <rect x="15" y="11" width="2" height="17" rx="0.5" fill="url(#${id}-wood)"/>
  <rect x="14.5" y="11" width="3" height="2" fill="url(#${id}-gold)"/>
  <circle cx="16" cy="7.5" r="3.5" fill="url(#${id}-gem)" filter="url(#${id}-glow)"/>
  <circle cx="15.2" cy="6.8" r="1" fill="#fff" opacity="0.65"/>
  <path d="M13 9.5 L19 9.5" stroke="#c4b5fd" stroke-width="0.5"/>
  <path d="M16 4 L16 3 M18 5.5 L19 4.5 M14 5.5 L13 4.5" stroke="#ddd6fe" stroke-width="0.5" opacity="0.7"/>
  `,
    id,
    '#8b5cf6',
  )
}

function drawStaff(id) {
  return wrap(
    `
  <rect x="14" y="9" width="4" height="20" rx="1" fill="url(#${id}-wood)"/>
  <path d="M14.5 12 H17.5 M14.5 16 H17.5 M14.5 20 H17.5" stroke="#292524" stroke-width="0.45" opacity="0.35"/>
  <path d="M11 9 H21 V11 H11 Z" fill="url(#${id}-gold)"/>
  <circle cx="16" cy="7" r="4.5" fill="url(#${id}-gem)" filter="url(#${id}-glow)"/>
  <path d="M12 7 C14 5 18 5 20 7" stroke="#fde68a" stroke-width="0.6" fill="none"/>
  <circle cx="14.5" cy="6" r="0.8" fill="#fff" opacity="0.5"/>
  <circle cx="17.5" cy="6.5" r="0.5" fill="#e9d5ff"/>
  `,
    id,
    '#6366f1',
  )
}

function drawBow(id, variant) {
  const thick = variant === 'great_bow' ? 2.6 : variant === 'composite_bow' ? 2 : 1.6
  const extra =
    variant === 'composite_bow'
      ? `<path d="M11 23 Q16 6 21 23" stroke="#78716c" stroke-width="1.1" fill="none" opacity="0.55"/>
         <path d="M12 20 Q16 10 20 20" stroke="#a8a29e" stroke-width="0.5" fill="none"/>`
      : variant === 'great_bow'
        ? `<rect x="14.5" y="11" width="3" height="12" rx="0.5" fill="#57534e"/>
           <rect x="15" y="12" width="1" height="10" fill="#78716c"/>`
        : ''
  const height = variant === 'great_bow' ? 2 : 3
  return wrap(
    `
  <path d="M10 24 Q16 ${height} 22 24" stroke="url(#${id}-wood)" stroke-width="${thick}" fill="none" stroke-linecap="round"/>
  <path d="M10.5 23.5 Q16 ${height + 1} 21.5 23.5" stroke="#fde68a" stroke-width="0.4" fill="none" opacity="0.35"/>
  ${extra}
  <line x1="10" y1="24" x2="22" y2="24" stroke="#e5e7eb" stroke-width="0.8"/>
  <line x1="10" y1="24" x2="22" y2="24" stroke="#94a3b8" stroke-width="0.3"/>
  <circle cx="16" cy="24" r="0.8" fill="#d6d3d1"/>
  `,
    id,
    variant === 'composite_bow' ? '#713f12' : '#d97706',
  )
}

function drawMace(id) {
  return wrap(
    `
  <rect x="15" y="14" width="2" height="14" fill="url(#${id}-wood)"/>
  <rect x="10.5" y="7" width="11" height="9" rx="2" fill="url(#${id}-steel)"/>
  <path d="M10.5 9 H21.5 M10.5 12 H21.5 M10.5 15 H21.5" stroke="#334155" stroke-width="0.5"/>
  <circle cx="12" cy="10" r="1.1" fill="#475569"/>
  <circle cx="20" cy="10" r="1.1" fill="#475569"/>
  <circle cx="16" cy="8" r="1.1" fill="#475569"/>
  <circle cx="14" cy="14" r="1" fill="#475569"/>
  <circle cx="18" cy="14" r="1" fill="#475569"/>
  <rect x="11" y="7" width="10" height="2" fill="#e2e8f0" opacity="0.25"/>
  <rect x="14" y="5" width="4" height="2" fill="#57534e"/>
  `,
    id,
    '#78716c',
  )
}

function drawClub(id) {
  return wrap(
    `
  <rect x="15" y="16" width="2.5" height="12" rx="0.5" fill="url(#${id}-wood)"/>
  <path d="M11 8 C11 4.5 21 4.5 21 8 C22 13 19.5 17 16 17 C12.5 17 10 13 11 8 Z" fill="url(#${id}-wood)"/>
  <path d="M12 9 C12 6.5 20 6.5 20 9 C20.5 12.5 18.5 15 16 15 C13.5 15 11.5 12.5 12 9 Z" fill="#a16207" opacity="0.5"/>
  <path d="M13 10 L19 11 M14 13 L18 13" stroke="#292524" stroke-width="0.5"/>
  <circle cx="16" cy="9" r="0.8" fill="#292524" opacity="0.3"/>
  `,
    id,
    '#57534e',
  )
}

function drawSmasher(id) {
  return wrap(
    `
  <rect x="14.5" y="15" width="3" height="13" fill="url(#${id}-wood)"/>
  <rect x="9.5" y="5" width="13" height="12" rx="4" fill="url(#${id}-steel)"/>
  <rect x="10.5" y="6" width="11" height="3" fill="#e2e8f0" opacity="0.2"/>
  <circle cx="11.5" cy="10.5" r="1.3" fill="#334155"/>
  <circle cx="20.5" cy="10.5" r="1.3" fill="#334155"/>
  <circle cx="16" cy="12.5" r="1.3" fill="#334155"/>
  <circle cx="13" cy="13.5" r="1" fill="#334155"/>
  <circle cx="19" cy="13.5" r="1" fill="#334155"/>
  <rect x="13" y="3" width="6" height="2" fill="#57534e"/>
  `,
    id,
    '#44403c',
  )
}

function drawAxe(id, large) {
  const head = large
    ? `<path d="M7 9 L19 5 L21 13 L13 18 L7 13 Z" fill="url(#${id}-steel)"/>
       <path d="M19 5 L25 7 L22 15 L19 10 Z" fill="#64748b"/>
       <path d="M8 11 L12 17 L10 14 Z" fill="#94a3b8" opacity="0.6"/>`
    : `<path d="M10 9 L18 7 L19 13 L13 16 L10 12 Z" fill="url(#${id}-steel)"/>
       <path d="M17 7 L21 9 L18 13 L17 10 Z" fill="#94a3b8"/>`
  return wrap(
    `
  <rect x="15" y="12" width="2.5" height="16" rx="0.5" fill="url(#${id}-wood)"/>
  ${head}
  <path d="M11 11 L17 9" stroke="#f8fafc" stroke-width="0.5" opacity="0.4"/>
  <rect x="14" y="26" width="4" height="2" fill="url(#${id}-leather)"/>
  `,
    id,
    large ? '#1c1917' : '#57534e',
  )
}

const builders = {
  knife: (id) => drawKnife(id, 'knife'),
  main_gauche: (id) => drawKnife(id, 'main_gauche'),
  dagger: (id) => drawKnife(id, 'dagger'),
  stiletto: (id) => drawKnife(id, 'stiletto'),
  sword: (id) => drawSword(id),
  falchion: (id) => drawFalchion(id),
  blade: (id) => drawSword(id, { long: true, wide: true, tint: '#4b5563' }),
  rapier: (id) => drawRapier(id),
  saber: (id) => drawSaber(id),
  spear: (id) => drawSpear(id),
  rod: (id) => drawRod(id),
  wand: (id) => drawWand(id),
  staff: (id) => drawStaff(id),
  bow: (id) => drawBow(id, 'bow'),
  great_bow: (id) => drawBow(id, 'great_bow'),
  composite_bow: (id) => drawBow(id, 'composite_bow'),
  mace: (id) => drawMace(id),
  club: (id) => drawClub(id),
  smasher: (id) => drawSmasher(id),
  axe: (id) => drawAxe(id, false),
  battle_axe: (id) => drawAxe(id, true),
}

function loadWeapons() {
  const pack = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'))
  const items = pack.items ?? []
  return items.filter((i) => i.type === 'weapon')
}

function resolveBuilder(weaponId, itemsById) {
  if (builders[weaponId]) return builders[weaponId]
  const item = itemsById.get(weaponId)
  const cls = item?.weaponClass
  switch (cls) {
    case 'knife':
      return (id) => drawKnife(id, 'knife')
    case 'sword':
      return (id) => drawSword(id)
    case 'spear':
      return (id) => drawSpear(id)
    case 'staff':
      return (id) => drawRod(id)
    case 'bow':
      return (id) => drawBow(id, 'bow')
    default:
      return null
  }
}

function runCheck() {
  const weapons = loadWeapons()
  const missing = weapons.filter((w) => !fs.existsSync(path.join(outDir, `${w.id}.svg`)))
  if (missing.length > 0) {
    console.error(`[icons:weapons] missing SVG for: ${missing.map((w) => w.id).join(', ')}`)
    console.error('Run: npm run icons:weapons')
    process.exit(1)
  }
  console.log(`[icons:weapons] OK — ${weapons.length} weapon icons present`)
}

function runGenerate() {
  const weapons = loadWeapons()
  const itemsById = new Map(
    JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8')).items.map((i) => [i.id, i]),
  )
  const expected = new Set(weapons.map((w) => w.id))
  fs.mkdirSync(outDir, { recursive: true })

  for (const weapon of weapons) {
    const build = resolveBuilder(weapon.id, itemsById)
    if (!build) {
      console.error(
        `[icons:weapons] no builder for "${weapon.id}" (weaponClass=${weapon.weaponClass ?? '?'}). ` +
          'Add a builders[...] entry in scripts/generate-weapon-icons.mjs',
      )
      process.exit(1)
    }
    fs.writeFileSync(path.join(outDir, `${weapon.id}.svg`), build(safeGradientId(weapon.id)))
  }

  for (const file of fs.readdirSync(outDir)) {
    if (!file.endsWith('.svg')) continue
    const id = file.slice(0, -4)
    if (!expected.has(id)) {
      fs.unlinkSync(path.join(outDir, file))
      console.log(`[icons:weapons] removed stale ${file}`)
    }
  }

  console.log(`[icons:weapons] wrote ${weapons.length} icons → client/public/items/weapons/`)
}

if (process.argv.includes('--check')) {
  runCheck()
} else {
  runGenerate()
}
