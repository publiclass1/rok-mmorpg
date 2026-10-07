/**
 * Standard skill bar SVG generator (32×32).
 *
 * Source: content/ro/skills.json → client/public/skills/{id}.svg
 * (unless skill row sets iconFile to another filename under /skills/)
 *
 *   npm run icons:skills
 *   npm run icons:skills:check
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_PATH = path.join(REPO_ROOT, 'content/ro/skills.json')
const outDir = path.join(REPO_ROOT, 'client/public/skills')

const defs = (id) => `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#374151"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="40%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="55%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>
    <linearGradient id="${id}-fire" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="50%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#fde047"/>
    </linearGradient>
    <linearGradient id="${id}-holy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff"/>
      <stop offset="45%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a16207"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <radialGradient id="${id}-gem" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#e0e7ff"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#312e81"/>
    </radialGradient>
    <filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="0.8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`

function frame(id, accent) {
  return `
  ${defs(id)}
  <rect width="32" height="32" rx="5" fill="url(#${id}-bg)"/>
  <rect x="1" y="1" width="30" height="30" rx="4" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="0.6"/>
  <path d="M3 27 Q16 23 29 27" stroke="#000" stroke-opacity="0.3" stroke-width="1" fill="none"/>`
}

function wrap(body, id, accent = '#64748b') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${frame(id, accent)}${body}</svg>`
}

function drawBasicAttack(id) {
  return wrap(
    `
  <path d="M18 6 L20 22 L16 24 L14 8 Z" fill="url(#${id}-steel)"/>
  <path d="M17 7 L19 20 L16 21 L15 9 Z" fill="#f1f5f9" opacity="0.45"/>
  <path d="M8 14 L14 10 L16 12 L10 18 Z" fill="#f97316" opacity="0.85"/>
  <path d="M7 15 L9 13 L11 17 Z" fill="#fdba74"/>
  <rect x="13" y="22" width="6" height="3" fill="url(#${id}-gold)"/>
  `,
    id,
    '#94a3b8',
  )
}

function drawSit(id) {
  return wrap(
    `
  <rect x="8" y="18" width="16" height="3" rx="1" fill="url(#${id}-wood)"/>
  <rect x="9" y="14" width="3" height="7" fill="url(#${id}-wood)"/>
  <rect x="20" y="14" width="3" height="7" fill="url(#${id}-wood)"/>
  <rect x="10" y="11" width="12" height="4" rx="1" fill="#57534e"/>
  <circle cx="16" cy="9" r="3" fill="#fcd34d"/>
  <path d="M14 8 Q16 6 18 8" stroke="#451a03" stroke-width="0.6" fill="none"/>
  `,
    id,
    '#78716c',
  )
}

function drawSwordMastery(id) {
  return wrap(
    `
  <path d="M11 8 L13 22 L16 23 L15 9 Z" fill="url(#${id}-steel)"/>
  <path d="M19 8 L21 22 L18 23 L17 9 Z" fill="url(#${id}-steel)"/>
  <path d="M12 9 L14 20" stroke="#f8fafc" stroke-width="0.5" opacity="0.6"/>
  <path d="M20 9 L18 20" stroke="#f8fafc" stroke-width="0.5" opacity="0.6"/>
  <rect x="9" y="21" width="14" height="2" fill="url(#${id}-gold)"/>
  <path d="M8 12 L24 12" stroke="#fbbf24" stroke-width="1.2" opacity="0.7"/>
  `,
    id,
    '#1e3a5f',
  )
}

function drawBash(id) {
  return wrap(
    `
  <path d="M14 7 L18 7 L17 20 L16 22 L15 20 Z" fill="url(#${id}-steel)"/>
  <rect x="11" y="20" width="10" height="2.5" fill="url(#${id}-gold)"/>
  <path d="M6 10 L12 16 L8 20 L4 14 Z" fill="url(#${id}-fire)" filter="url(#${id}-glow)"/>
  <path d="M20 8 L26 14 L22 18 L16 12 Z" fill="#fbbf24" opacity="0.5"/>
  <circle cx="24" cy="9" r="2" fill="#fde047" opacity="0.8"/>
  `,
    id,
    '#ea580c',
  )
}

function drawProvoke(id) {
  return wrap(
    `
  <circle cx="16" cy="14" r="7" fill="#fca5a5"/>
  <path d="M11 13 Q16 8 21 13" stroke="#7f1d1d" stroke-width="1.2" fill="none"/>
  <circle cx="13" cy="13" r="1" fill="#450a0a"/>
  <circle cx="19" cy="13" r="1" fill="#450a0a"/>
  <path d="M13 17 Q16 20 19 17" stroke="#7f1d1d" stroke-width="1" fill="none"/>
  <path d="M6 10 L4 6 M26 10 L28 6 M16 4 L16 2" stroke="#ef4444" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M8 22 L10 26 M24 22 L22 26" stroke="#f87171" stroke-width="1" stroke-linecap="round"/>
  `,
    id,
    '#dc2626',
  )
}

function drawEndure(id) {
  return wrap(
    `
  <path d="M10 10 H22 V24 H10 Z" fill="#57534e"/>
  <path d="M11 11 H21 V23 H11 Z" fill="url(#${id}-steel)"/>
  <path d="M12 12 H20 V14 H12 Z" fill="#94a3b8"/>
  <path d="M14 16 H18 V20 H14 Z" fill="#1e293b"/>
  <circle cx="16" cy="18" r="1.5" fill="url(#${id}-gold)"/>
  <path d="M8 14 L10 12 L10 22 L8 20 Z" fill="#44403c"/>
  <path d="M24 14 L22 12 L22 22 L24 20 Z" fill="#44403c"/>
  `,
    id,
    '#64748b',
  )
}

function drawMagnum(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="9" fill="url(#${id}-fire)" filter="url(#${id}-glow)" opacity="0.9"/>
  <circle cx="16" cy="16" r="5" fill="#fde047" opacity="0.7"/>
  <path d="M16 6 L17 14 L16 16 L15 14 Z" fill="url(#${id}-steel)"/>
  <rect x="14" y="16" width="4" height="8" fill="url(#${id}-gold)"/>
  <path d="M10 8 L12 10 M22 8 L20 10 M8 16 L10 16 M24 16 L22 16" stroke="#fef08a" stroke-width="1" stroke-linecap="round"/>
  `,
    id,
    '#f97316',
  )
}

function drawHpRecovery(id) {
  return wrap(
    `
  <path d="M16 22 C10 16 8 12 11 9 C13 7 15 8 16 10 C17 8 19 7 21 9 C24 12 22 16 16 22 Z" fill="#ef4444"/>
  <path d="M16 19 C12 15 11 12 13 10 C14 9 15 10 16 11 C17 10 18 9 19 10 C21 12 20 15 16 19 Z" fill="#fca5a5"/>
  <path d="M14 14 H18 V18 H14 Z" fill="#fff" opacity="0.9"/>
  <path d="M15 11 V21 M11 15 H21" stroke="#16a34a" stroke-width="2" stroke-linecap="round"/>
  `,
    id,
    '#22c55e',
  )
}

function drawSpearMastery(id) {
  return wrap(
    `
  <line x1="8" y1="26" x2="24" y2="8" stroke="url(#${id}-wood)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M22 8 L26 6 L24 11 L21 10 Z" fill="url(#${id}-steel)"/>
  <path d="M10 12 L14 10 M12 16 L16 14" stroke="#fbbf24" stroke-width="0.8" stroke-linecap="round"/>
  <circle cx="12" cy="20" r="2" fill="none" stroke="#38bdf8" stroke-width="0.8"/>
  <circle cx="20" cy="12" r="2" fill="none" stroke="#38bdf8" stroke-width="0.8"/>
  `,
    id,
    '#0284c7',
  )
}

function drawPierce(id) {
  return wrap(
    `
  <line x1="6" y1="24" x2="26" y2="10" stroke="url(#${id}-wood)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M24 9 L28 8 L26 13 L23 12 Z" fill="url(#${id}-steel)"/>
  <path d="M8 22 L26 10" stroke="#7dd3fc" stroke-width="1" stroke-dasharray="2 1" opacity="0.8"/>
  <circle cx="20" cy="12" r="1.5" fill="#ef4444" opacity="0.9"/>
  <circle cx="14" cy="16" r="1.2" fill="#f87171" opacity="0.7"/>
  `,
    id,
    '#0ea5e9',
  )
}

function drawBrandishSpear(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="8" fill="none" stroke="#7dd3fc" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/>
  <path d="M16 16 L24 8" stroke="url(#${id}-wood)" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M23 8 L27 7 L25 12 Z" fill="url(#${id}-steel)"/>
  <path d="M10 20 Q16 10 22 20 Q16 14 10 20" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <path d="M12 18 Q16 12 20 18" stroke="#bae6fd" stroke-width="0.8" fill="none"/>
  `,
    id,
    '#0369a1',
  )
}

function drawSpearStab(id) {
  return wrap(
    `
  <line x1="10" y1="26" x2="22" y2="10" stroke="url(#${id}-wood)" stroke-width="3" stroke-linecap="round"/>
  <path d="M21 9 L26 8 L23 14 L20 13 Z" fill="url(#${id}-steel)"/>
  <path d="M22 10 L28 10" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M24 8 L30 7 L28 11 Z" fill="#e2e8f0" opacity="0.6"/>
  <rect x="8" y="24" width="6" height="2" fill="#ef4444" opacity="0.5" transform="rotate(-45 11 25)"/>
  `,
    id,
    '#1d4ed8',
  )
}

function drawSpearBoomerang(id) {
  return wrap(
    `
  <path d="M8 20 Q16 6 24 14 Q18 22 8 20" fill="none" stroke="#38bdf8" stroke-width="1" opacity="0.5"/>
  <path d="M20 10 L24 8 L22 14 L18 13 Z" fill="url(#${id}-steel)" transform="rotate(15 21 11)"/>
  <line x1="18" y1="12" x2="10" y2="18" stroke="url(#${id}-wood)" stroke-width="2" stroke-linecap="round"/>
  <path d="M6 19 L4 21 L7 22 Z" fill="#fbbf24"/>
  <circle cx="24" cy="12" r="1.5" fill="#ef4444"/>
  `,
    id,
    '#0891b2',
  )
}

function drawTwohandQuicken(id) {
  return wrap(
    `
  <path d="M14 6 L16 6 L15 22 L14 22 Z" fill="url(#${id}-steel)"/>
  <path d="M18 8 L20 8 L19 20 L18 20 Z" fill="#94a3b8"/>
  <rect x="11" y="20" width="10" height="2" fill="url(#${id}-gold)"/>
  <path d="M6 10 L4 14 L6 18" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M26 10 L28 14 L26 18" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M5 16 H9 M23 16 H27" stroke="#c4b5fd" stroke-width="1" stroke-linecap="round"/>
  `,
    id,
    '#6366f1',
  )
}

function drawCounterAttack(id) {
  return wrap(
    `
  <path d="M9 11 H23 V25 H9 Z" fill="url(#${id}-steel)"/>
  <path d="M11 13 H21 V23 H11 Z" fill="#475569"/>
  <path d="M7 13 L9 11 L9 25 L7 23 Z" fill="#334155"/>
  <path d="M20 8 L26 14 L20 14 Z" fill="#f87171"/>
  <path d="M22 10 L28 16 L22 16" stroke="#fca5a5" stroke-width="1" fill="none"/>
  <circle cx="16" cy="18" r="2" fill="url(#${id}-gold)"/>
  `,
    id,
    '#64748b',
  )
}

function drawBowlingBash(id) {
  return wrap(
    `
  <circle cx="10" cy="22" r="3" fill="#6366f1"/>
  <circle cx="16" cy="24" r="3" fill="#818cf8"/>
  <circle cx="22" cy="22" r="3" fill="#6366f1"/>
  <circle cx="13" cy="18" r="2.5" fill="#4f46e5"/>
  <circle cx="19" cy="18" r="2.5" fill="#4f46e5"/>
  <path d="M14 8 L18 8 L17 16 L16 18 L15 16 Z" fill="url(#${id}-steel)"/>
  <path d="M6 12 L10 10 L14 14" stroke="#fde047" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M26 12 L22 10 L18 14" stroke="#fde047" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  `,
    id,
    '#4f46e5',
  )
}

function drawRiding(id) {
  return wrap(
    `
  <ellipse cx="16" cy="20" rx="9" ry="4" fill="#78350f"/>
  <path d="M8 20 Q16 14 24 20" fill="#92400e"/>
  <rect x="10" y="17" width="12" height="3" rx="1" fill="url(#${id}-gold)"/>
  <path d="M11 17 L13 14 H19 L21 17" fill="#57534e"/>
  <circle cx="13" cy="15" r="0.8" fill="#d6d3d1"/>
  <circle cx="19" cy="15" r="0.8" fill="#d6d3d1"/>
  `,
    id,
    '#a16207',
  )
}

function drawCavalierMastery(id) {
  return wrap(
    `
  <ellipse cx="16" cy="22" rx="8" ry="3" fill="#44403c"/>
  <path d="M12 18 L20 14 L22 18 Z" fill="#78716c"/>
  <line x1="20" y1="14" x2="26" y2="8" stroke="url(#${id}-wood)" stroke-width="1.8"/>
  <path d="M25 7 L28 6 L27 10 Z" fill="url(#${id}-steel)"/>
  <path d="M10 20 L14 16 L18 20" fill="url(#${id}-gold)" opacity="0.8"/>
  <circle cx="14" cy="17" r="2" fill="#fcd34d"/>
  `,
    id,
    '#ca8a04',
  )
}

function drawPecoPecoRide(id) {
  return wrap(
    `
  <ellipse cx="16" cy="20" rx="10" ry="6" fill="#65a30d"/>
  <circle cx="22" cy="14" r="5" fill="#84cc16"/>
  <circle cx="24" cy="13" r="1.2" fill="#1c1917"/>
  <path d="M26 13 L29 12 L28 14 Z" fill="#facc15"/>
  <path d="M8 20 L6 22 L9 23 Z" fill="#f97316"/>
  <path d="M12 18 L14 14 L18 18" fill="url(#${id}-gold)"/>
  <rect x="13" y="16" width="6" height="2" fill="#57534e"/>
  `,
    id,
    '#16a34a',
  )
}

function drawPushcart(id) {
  return wrap(
    `
  <rect x="6" y="14" width="20" height="10" rx="2" fill="#78716c"/>
  <rect x="8" y="10" width="16" height="6" rx="1" fill="#a8a29e"/>
  <circle cx="10" cy="26" r="3" fill="#44403c"/>
  <circle cx="22" cy="26" r="3" fill="#44403c"/>
  <path d="M4 12 L8 10" stroke="#ca8a04" stroke-width="2" stroke-linecap="round"/>
  `,
    id,
    '#ca8a04',
  )
}

function drawFalconMastery(id) {
  return wrap(
    `
  <path d="M8 20 Q16 6 24 18 L20 20 L16 14 L12 20 Z" fill="#1e293b"/>
  <path d="M20 18 L28 14 L26 20 Z" fill="#334155"/>
  <circle cx="22" cy="15" r="1.2" fill="#fbbf24"/>
  <path d="M10 22 L6 24 M14 22 L12 26" stroke="#64748b" stroke-width="1.2" stroke-linecap="round"/>
  `,
    id,
    '#0f766e',
  )
}

function drawHeal(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="10" fill="url(#${id}-holy)" filter="url(#${id}-glow)" opacity="0.95"/>
  <path d="M16 9 V23 M10 15 H22" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M16 9 V23 M10 15 H22" stroke="#fef9c3" stroke-width="1" stroke-linecap="round"/>
  <circle cx="12" cy="11" r="1" fill="#fff" opacity="0.7"/>
  <circle cx="20" cy="12" r="0.8" fill="#fff" opacity="0.5"/>
  `,
    id,
    '#eab308',
  )
}

function drawMobBash(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="9" fill="#4c1d95" opacity="0.6"/>
  <path d="M14 7 L18 7 L17 20 L16 22 L15 20 Z" fill="#a78bfa"/>
  <path d="M6 12 L10 18 L7 21 L3 15 Z" fill="#7c3aed"/>
  `,
    id,
    '#7c3aed',
  )
}

function drawMobHammer(id) {
  return wrap(
    `
  <rect x="14" y="14" width="4" height="12" fill="url(#${id}-wood)"/>
  <rect x="9" y="6" width="14" height="9" rx="2" fill="url(#${id}-steel)"/>
  <rect x="10" y="7" width="12" height="3" fill="#c4b5fd"/>
  <path d="M6 10 L10 14 M26 10 L22 14" stroke="#a78bfa" stroke-width="1.2"/>
  `,
    id,
    '#6d28d9',
  )
}

function drawMobMeteor(id) {
  return wrap(
    `
  <circle cx="12" cy="10" r="3" fill="#f97316" filter="url(#${id}-glow)"/>
  <circle cx="20" cy="8" r="2" fill="#fde047"/>
  <circle cx="18" cy="14" r="2.5" fill="#ef4444"/>
  <path d="M10 12 L16 22 L22 14 Z" fill="url(#${id}-fire)" opacity="0.85"/>
  <path d="M8 24 L24 24" stroke="#7c3aed" stroke-width="1"/>
  `,
    id,
    '#c026d3',
  )
}

function drawMobDark(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="9" fill="#1e1b4b"/>
  <path d="M16 8 L20 16 L16 24 L12 16 Z" fill="#4c1d95"/>
  <path d="M16 11 L18 16 L16 21 L14 16 Z" fill="#a78bfa" opacity="0.7"/>
  <circle cx="16" cy="16" r="2" fill="#0f172a"/>
  `,
    id,
    '#5b21b6',
  )
}

function drawMobPulse(id) {
  return wrap(
    `
  <circle cx="16" cy="16" r="4" fill="#22d3ee" filter="url(#${id}-glow)"/>
  <circle cx="16" cy="16" r="7" fill="none" stroke="#06b6d4" stroke-width="1" opacity="0.7"/>
  <circle cx="16" cy="16" r="10" fill="none" stroke="#0891b2" stroke-width="0.8" opacity="0.45"/>
  <path d="M16 4 L16 8 M16 24 L16 28 M4 16 L8 16 M24 16 L28 16" stroke="#67e8f9" stroke-width="1" stroke-linecap="round"/>
  `,
    id,
    '#0891b2',
  )
}

const builders = {
  basic_attack: drawBasicAttack,
  sit: drawSit,
  sword_mastery: drawSwordMastery,
  bash: drawBash,
  provoke: drawProvoke,
  endure: drawEndure,
  magnum: drawMagnum,
  hp_recovery: drawHpRecovery,
  spear_mastery: drawSpearMastery,
  pierce: drawPierce,
  brandish_spear: drawBrandishSpear,
  spear_stab: drawSpearStab,
  spear_boomerang: drawSpearBoomerang,
  twohand_quicken: drawTwohandQuicken,
  counter_attack: drawCounterAttack,
  bowling_bash: drawBowlingBash,
  riding: drawRiding,
  cavalier_mastery: drawCavalierMastery,
  peco_peco_ride: drawPecoPecoRide,
  pushcart: drawPushcart,
  falcon_mastery: drawFalconMastery,
  heal: drawHeal,
  mob_bash: drawMobBash,
  mob_hammer_fall: drawMobHammer,
  mob_meteor_storm: drawMobMeteor,
  mob_dark_strike: drawMobDark,
  mob_pulse_strike: drawMobPulse,
}

function skillOutputFile(skill) {
  if (skill.iconFile) {
    const base = path.basename(skill.iconFile)
    return base.endsWith('.svg') ? base : `${base}.svg`
  }
  return `${skill.id}.svg`
}

function loadSkills() {
  return JSON.parse(fs.readFileSync(SKILLS_PATH, 'utf8')).skills ?? []
}

function runCheck() {
  const skills = loadSkills()
  const missing = []
  for (const skill of skills) {
    const file = skillOutputFile(skill)
    if (!fs.existsSync(path.join(outDir, file))) missing.push(skill.id)
  }
  if (missing.length > 0) {
    console.error(`[icons:skills] missing SVG for: ${missing.join(', ')}`)
    console.error('Run: npm run icons:skills')
    process.exit(1)
  }
  console.log(`[icons:skills] OK — ${skills.length} skill icons present`)
}

function runGenerate() {
  const skills = loadSkills()
  const expectedFiles = new Set()
  fs.mkdirSync(outDir, { recursive: true })

  for (const skill of skills) {
    const build = builders[skill.id]
    if (!build) {
      console.error(
        `[icons:skills] no builder for "${skill.id}" — add to scripts/generate-skill-icons.mjs`,
      )
      process.exit(1)
    }
    const file = skillOutputFile(skill)
    expectedFiles.add(file)
    const safeId = skill.id.replace(/[^a-z0-9]/gi, '')
    fs.writeFileSync(path.join(outDir, file), build(safeId))
  }

  for (const file of fs.readdirSync(outDir)) {
    if (!file.endsWith('.svg')) continue
    if (!expectedFiles.has(file)) {
      fs.unlinkSync(path.join(outDir, file))
      console.log(`[icons:skills] removed stale ${file}`)
    }
  }

  console.log(`[icons:skills] wrote ${skills.length} icons → client/public/skills/`)
}

if (process.argv.includes('--check')) {
  runCheck()
} else {
  runGenerate()
}
