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
      <stop offset="0%" stop-color="#3d3258"/>
      <stop offset="55%" stop-color="#2a2240"/>
      <stop offset="100%" stop-color="#12101c"/>
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
  <rect width="32" height="32" rx="2" fill="#0a0812"/>
  <rect x="1" y="1" width="30" height="30" rx="1" fill="url(#${id}-bg)"/>
  <rect x="1" y="1" width="30" height="30" rx="1" fill="none" stroke="#6b5a8f" stroke-opacity="0.55" stroke-width="0.5"/>
  <rect x="1.5" y="1.5" width="29" height="29" rx="1" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="0.4"/>
  <path d="M2 29 L30 29" stroke="#000" stroke-opacity="0.35" stroke-width="0.8"/>`
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

function drawPlayDead(id) {
  return wrap(
    `
  <ellipse cx="16" cy="22" rx="9" ry="3" fill="#1c1917" opacity="0.5"/>
  <circle cx="12" cy="14" r="3" fill="#fcd34d"/>
  <path d="M10 13 L11 14 L10 15" stroke="#451a03" stroke-width="0.5" fill="none"/>
  <path d="M15 20 L22 18 L24 20 L17 22 Z" fill="#57534e"/>
  <path d="M8 20 L14 18 L12 20" stroke="#78716c" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <path d="M20 12 L22 10 M22 12 L20 10" stroke="#ef4444" stroke-width="0.8" stroke-linecap="round"/>
  `,
    id,
    '#6b7280',
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
  <path d="M15 5 L17 5 L18 21 L16 23 L14 21 Z" fill="url(#${id}-steel)"/>
  <path d="M15.5 6 L16.5 6 L17 19 L16 20 L15 19 Z" fill="#f8fafc" opacity="0.5"/>
  <rect x="12" y="21" width="8" height="2" fill="url(#${id}-gold)"/>
  <rect x="13" y="23" width="6" height="1.5" fill="#57534e"/>
  <path d="M5 11 L9 8 L13 14 L9 18 L4 14 Z" fill="#fde047"/>
  <path d="M6 12 L9 10 L11 14 L8 16 L5 13 Z" fill="url(#${id}-fire)" filter="url(#${id}-glow)"/>
  <path d="M7 13 L9 11 L10 14 L8 15 Z" fill="#fff" opacity="0.6"/>
  <path d="M20 9 L24 12 L21 15 L17 12 Z" fill="#fbbf24" opacity="0.45"/>
  `,
    id,
    '#ea580c',
  )
}

function drawProvoke(id) {
  return wrap(
    `
  <circle cx="16" cy="15" r="8" fill="#e11d48"/>
  <circle cx="16" cy="15" r="7" fill="#f43f5e"/>
  <path d="M10 11 L13 12 L16 10 L19 12 L22 11" stroke="#7f1d1d" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="13" cy="14" rx="2.2" ry="2.5" fill="#fff"/>
  <ellipse cx="19" cy="14" rx="2.2" ry="2.5" fill="#fff"/>
  <circle cx="13" cy="14.5" r="1.1" fill="#1c1917"/>
  <circle cx="19" cy="14.5" r="1.1" fill="#1c1917"/>
  <path d="M12 19 Q16 22 20 19 L19 20 Q16 23 13 20 Z" fill="#fff"/>
  <path d="M13.5 19.5 H18.5 V20.5 H13.5 Z" fill="#881337"/>
  <path d="M5 9 L3 5 M27 9 L29 5" stroke="#fb7185" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M7 21 L9 26 M25 21 L23 26" stroke="#be123c" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M16 5 L16 3" stroke="#fda4af" stroke-width="1.2" stroke-linecap="round"/>
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

function drawBowArrow(id, accent = '#a16207') {
  return wrap(
    `
  <path d="M8 24 Q16 8 24 24" stroke="${accent}" stroke-width="1.2" fill="none"/>
  <path d="M22 10 L26 14 L22 18 L20 14 Z" fill="url(#${id}-steel)"/>
  <path d="M10 20 L22 12" stroke="#78716c" stroke-width="1" stroke-linecap="round"/>
  `,
    id,
    accent,
  )
}

function drawOwlsEye(id) {
  return wrap(
    `
  <ellipse cx="16" cy="16" rx="9" ry="7" fill="#f8fafc"/>
  <circle cx="16" cy="16" r="4" fill="#1e293b"/>
  <circle cx="17" cy="15" r="1.2" fill="#fff"/>
  <path d="M7 14 Q16 6 25 14" stroke="#854d0e" stroke-width="1" fill="none"/>
  `,
    id,
    '#ca8a04',
  )
}

function drawVulturesEye(id) {
  return wrap(
    `
  <ellipse cx="14" cy="16" rx="6" ry="5" fill="#e2e8f0"/>
  <circle cx="14" cy="16" r="2.5" fill="#0f172a"/>
  <ellipse cx="20" cy="15" rx="5" ry="4" fill="#cbd5e1"/>
  <circle cx="20" cy="15" r="2" fill="#0f172a"/>
  <path d="M8 10 L24 8" stroke="#a16207" stroke-width="1.2"/>
  `,
    id,
    '#78716c',
  )
}

function drawDoubleStrafe(id) {
  return wrap(
    `
  <path d="M6 20 L20 10 L18 12 L22 8 L20 14" stroke="url(#${id}-steel)" stroke-width="1.2" fill="none"/>
  <path d="M10 24 L24 14 L22 16 L26 12 L24 18" stroke="url(#${id}-gold)" stroke-width="1.2" fill="none"/>
  <path d="M8 24 Q16 12 24 24" stroke="#a16207" stroke-width="1" fill="none"/>
  `,
    id,
    '#b45309',
  )
}

function drawArrowShower(id) {
  return wrap(
    `
  <path d="M8 6 L10 14 M14 4 L14 12 M20 5 L18 13 M24 7 L22 15" stroke="#78716c" stroke-width="1" stroke-linecap="round"/>
  <path d="M10 16 L12 22 M16 15 L16 24 M20 16 L18 23" stroke="url(#${id}-steel)" stroke-width="1.2" stroke-linecap="round"/>
  <ellipse cx="16" cy="26" rx="10" ry="2" fill="#451a03" opacity="0.4"/>
  `,
    id,
    '#92400e',
  )
}

function drawArrowCrafting(id) {
  return wrap(
    `
  <rect x="10" y="18" width="12" height="3" fill="url(#${id}-wood)"/>
  <path d="M14 8 L16 20 L15 21 L13 9 Z" fill="url(#${id}-steel)"/>
  <path d="M20 10 L22 18 L20 17 Z" fill="#64748b"/>
  `,
    id,
    '#78716c',
  )
}

function drawTrapIcon(id, accent) {
  return wrap(
    `
  <circle cx="16" cy="20" r="6" fill="none" stroke="${accent}" stroke-width="1.5"/>
  <path d="M16 14 L16 10 M13 16 L10 14 M19 16 L22 14" stroke="${accent}" stroke-width="1" stroke-linecap="round"/>
  <circle cx="16" cy="20" r="2" fill="${accent}" opacity="0.8"/>
  `,
    id,
    accent,
  )
}

function drawRemoveTrap(id) {
  return drawTrapIcon(id, '#94a3b8')
}

function drawTalkWithCutePet(id) {
  return drawFalconMastery(id)
}

function drawBeastBane(id) {
  return wrap(
    `
  <path d="M10 22 L14 10 L18 22 Z" fill="url(#${id}-steel)"/>
  <path d="M18 22 L22 12 L26 22 Z" fill="url(#${id}-gold)"/>
  <path d="M8 24 L28 24" stroke="#451a03" stroke-width="1"/>
  `,
    id,
    '#b91c1c',
  )
}

function drawBlitzBeat(id) {
  return wrap(
    `
  <path d="M6 8 L20 20 L16 18 L22 26 L14 20 Z" fill="#1e293b"/>
  <path d="M20 20 L28 16" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="14" r="1.5" fill="#ef4444"/>
  `,
    id,
    '#0f766e',
  )
}

function drawDetect(id) {
  return wrap(
    `
  <circle cx="16" cy="18" r="8" fill="none" stroke="#22d3ee" stroke-width="1.2" opacity="0.8"/>
  <circle cx="16" cy="18" r="4" fill="none" stroke="#22d3ee" stroke-width="1"/>
  <path d="M16 10 L16 6 M16 26 L16 30" stroke="#64748b" stroke-width="1"/>
  `,
    id,
    '#0891b2',
  )
}

function drawLandMine(id) {
  return wrap(
    `
  <circle cx="16" cy="20" r="7" fill="#374151"/>
  <circle cx="16" cy="20" r="3" fill="#ef4444"/>
  <path d="M16 13 L16 8" stroke="#9ca3af" stroke-width="1.2"/>
  `,
    id,
    '#dc2626',
  )
}

function drawSpringTrap(id) {
  return wrap(
    `
  <path d="M10 22 Q12 14 14 22 Q16 14 18 22 Q20 14 22 22" stroke="url(#${id}-gold)" stroke-width="1.5" fill="none"/>
  <rect x="8" y="23" width="16" height="2" fill="#57534e"/>
  `,
    id,
    '#ca8a04',
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

function drawFireBolt(id) {
  return wrap(
    `<path d="M16 6 L19 14 L16 26 L13 14 Z" fill="url(#${id}-fire)" filter="url(#${id}-glow)"/>
  <circle cx="16" cy="12" r="2" fill="#fff" opacity="0.8"/>`,
    id,
    '#f97316',
  )
}

function drawColdBolt(id) {
  return wrap(
    `<path d="M16 5 L20 12 L16 27 L12 12 Z" fill="#38bdf8" stroke="#0ea5e9" stroke-width="0.6"/>
  <path d="M16 9 L16 22 M11 14 L21 14" stroke="#e0f2fe" stroke-width="1.2" stroke-linecap="round"/>`,
    id,
    '#0ea5e9',
  )
}

function drawLightningBolt(id) {
  return wrap(
    `<path d="M18 5 L12 15 H16 L14 27 L22 14 H17 Z" fill="#fde047" stroke="#eab308" stroke-width="0.5" filter="url(#${id}-glow)"/>`,
    id,
    '#eab308',
  )
}

function drawNapalmBeat(id) {
  return wrap(
    `<circle cx="16" cy="16" r="8" fill="url(#${id}-gem)" opacity="0.9"/>
  <path d="M8 16 Q16 8 24 16 Q16 24 8 16" fill="none" stroke="#c4b5fd" stroke-width="1.2"/>`,
    id,
    '#6366f1',
  )
}

function drawSoulStrike(id) {
  return wrap(
    `<circle cx="16" cy="14" r="6" fill="url(#${id}-holy)" opacity="0.85"/>
  <path d="M10 22 Q16 18 22 22" stroke="#fef08a" stroke-width="1.5" fill="none"/>
  <circle cx="13" cy="12" r="1" fill="#fff"/><circle cx="19" cy="12" r="1" fill="#fff"/>`,
    id,
    '#ca8a04',
  )
}

function drawFireBall(id) {
  return wrap(
    `<circle cx="16" cy="16" r="9" fill="url(#${id}-fire)" filter="url(#${id}-glow)"/>
  <circle cx="16" cy="16" r="4" fill="#fff" opacity="0.5"/>`,
    id,
    '#ef4444',
  )
}

function drawFrostDiver(id) {
  return wrap(
    `<path d="M16 6 L22 16 L16 26 L10 16 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="0.6"/>
  <path d="M16 10 L16 22 M12 16 L20 16" stroke="#f0f9ff" stroke-width="1"/>`,
    id,
    '#0284c7',
  )
}

function drawStoneCurse(id) {
  return wrap(
    `<rect x="10" y="10" width="12" height="14" rx="2" fill="#78716c"/>
  <path d="M10 14 H22 M12 18 H20" stroke="#a8a29e" stroke-width="0.8"/>`,
    id,
    '#57534e',
  )
}

function drawEnergyCoat(id) {
  return wrap(
    `<circle cx="16" cy="16" r="10" fill="none" stroke="#60a5fa" stroke-width="2" opacity="0.8"/>
  <circle cx="16" cy="16" r="6" fill="#1d4ed8" opacity="0.35"/>`,
    id,
    '#3b82f6',
  )
}

function drawSafetyWall(id) {
  return wrap(
    `<path d="M16 6 L24 10 V20 L16 26 L8 20 V10 Z" fill="url(#${id}-steel)" opacity="0.9"/>
  <path d="M16 10 V22" stroke="#94a3b8" stroke-width="1"/>`,
    id,
    '#64748b',
  )
}

function drawSight(id) {
  return wrap(
    `<ellipse cx="16" cy="16" rx="9" ry="6" fill="#fef3c7" stroke="#d97706" stroke-width="0.8"/>
  <circle cx="16" cy="16" r="3" fill="#1e293b"/>`,
    id,
    '#f59e0b',
  )
}

function drawMeteorStorm(id) {
  return drawMobMeteor(id)
}

function drawJupitelThunder(id) {
  return wrap(
    `<circle cx="16" cy="16" r="7" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8"/>
  <path d="M16 8 L14 16 H18 L15 24 L20 14 H16 Z" fill="#fde047"/>`,
    id,
    '#eab308',
  )
}

function drawLordOfVermilion(id) {
  return wrap(
    `<path d="M16 4 L20 12 L28 14 L20 16 L16 28 L12 16 L4 14 L12 12 Z" fill="#f97316" opacity="0.85"/>
  <path d="M10 20 L22 20" stroke="#fde047" stroke-width="1.5"/>`,
    id,
    '#dc2626',
  )
}

function drawWaterBall(id) {
  return wrap(
    `<circle cx="16" cy="16" r="8" fill="#38bdf8" stroke="#0369a1" stroke-width="0.8"/>
  <ellipse cx="13" cy="13" rx="2" ry="1" fill="#e0f2fe" opacity="0.7"/>`,
    id,
    '#0284c7',
  )
}

function drawIceWall(id) {
  return wrap(
    `<rect x="8" y="8" width="6" height="18" fill="#bae6fd" stroke="#0ea5e9"/>
  <rect x="14" y="6" width="6" height="20" fill="#7dd3fc" stroke="#0284c7"/>
  <rect x="20" y="9" width="4" height="16" fill="#e0f2fe" stroke="#38bdf8"/>`,
    id,
    '#0ea5e9',
  )
}

function drawFrostNova(id) {
  return wrap(
    `<circle cx="16" cy="16" r="3" fill="#e0f2fe"/>
  <path d="M16 6 L16 10 M16 22 L16 26 M6 16 L10 16 M22 16 L26 16" stroke="#38bdf8" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="9" fill="none" stroke="#0ea5e9" stroke-width="1"/>`,
    id,
    '#0284c7',
  )
}

function drawStormGust(id) {
  return wrap(
    `<path d="M8 20 Q16 8 24 20" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <path d="M10 22 L14 18 L18 22 L22 18" stroke="#e2e8f0" stroke-width="1.2" fill="none"/>
  <circle cx="16" cy="24" r="2" fill="#38bdf8"/>`,
    id,
    '#64748b',
  )
}

function drawEarthSpike(id) {
  return wrap(
    `<path d="M16 26 L10 14 L16 6 L22 14 Z" fill="#a8a29e" stroke="#57534e"/>
  <path d="M16 10 L16 22" stroke="#d6d3d1" stroke-width="0.8"/>`,
    id,
    '#78716c',
  )
}

function drawHeavensDrive(id) {
  return wrap(
    `<path d="M6 22 L16 8 L26 22 Z" fill="#a16207" opacity="0.9"/>
  <path d="M10 20 L16 12 L22 20" stroke="#fde68a" stroke-width="1" fill="none"/>`,
    id,
    '#92400e',
  )
}

function drawQuagmire(id) {
  return wrap(
    `<ellipse cx="16" cy="20" rx="11" ry="5" fill="#451a03" opacity="0.8"/>
  <path d="M8 18 Q16 22 24 18" stroke="#78350f" stroke-width="1.5" fill="none"/>`,
    id,
    '#78350f',
  )
}

function drawSense(id) {
  return wrap(
    `<circle cx="16" cy="16" r="8" fill="none" stroke="#f472b6" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="4" fill="#fbcfe8"/>
  <path d="M16 8 L16 11 M16 21 L16 24" stroke="#ec4899" stroke-width="1"/>`,
    id,
    '#db2777',
  )
}

function drawDispell(id) {
  return wrap(
    `<circle cx="16" cy="16" r="9" fill="url(#${id}-gem)" opacity="0.5"/>
  <path d="M10 10 L22 22 M22 10 L10 22" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/>`,
    id,
    '#6366f1',
  )
}

function drawMagicRod(id) {
  return wrap(
    `<rect x="15" y="6" width="2" height="20" fill="url(#${id}-wood)"/>
  <circle cx="16" cy="8" r="3" fill="url(#${id}-gem)" filter="url(#${id}-glow)"/>`,
    id,
    '#7c3aed',
  )
}

const builders = {
  basic_attack: drawBasicAttack,
  sit: drawSit,
  play_dead: drawPlayDead,
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
  owls_eye: drawOwlsEye,
  vultures_eye: drawVulturesEye,
  double_strafe: drawDoubleStrafe,
  arrow_shower: drawArrowShower,
  arrow_crafting: drawArrowCrafting,
  ankle_snare: (id) => drawTrapIcon(id, '#84cc16'),
  shockwave_trap: (id) => drawTrapIcon(id, '#f97316'),
  sandman_trap: (id) => drawTrapIcon(id, '#eab308'),
  flasher_trap: (id) => drawTrapIcon(id, '#facc15'),
  freezing_trap: (id) => drawTrapIcon(id, '#38bdf8'),
  blast_mine: (id) => drawTrapIcon(id, '#ef4444'),
  claymore_trap: (id) => drawTrapIcon(id, '#b91c1c'),
  remove_trap: drawRemoveTrap,
  talk_with_cute_pet: drawTalkWithCutePet,
  beast_bane: drawBeastBane,
  falcon_mastery: drawFalconMastery,
  blitz_beat: drawBlitzBeat,
  detect: drawDetect,
  land_mine: drawLandMine,
  spring_trap: drawSpringTrap,
  heal: drawHeal,
  fire_bolt: drawFireBolt,
  cold_bolt: drawColdBolt,
  lightning_bolt: drawLightningBolt,
  napalm_beat: drawNapalmBeat,
  soul_strike: drawSoulStrike,
  fire_ball: drawFireBall,
  frost_diver: drawFrostDiver,
  stone_curse: drawStoneCurse,
  energy_coat: drawEnergyCoat,
  safety_wall: drawSafetyWall,
  sight: drawSight,
  meteor_storm: drawMeteorStorm,
  jupitel_thunder: drawJupitelThunder,
  lord_of_vermilion: drawLordOfVermilion,
  water_ball: drawWaterBall,
  ice_wall: drawIceWall,
  frost_nova: drawFrostNova,
  storm_gust: drawStormGust,
  earth_spike: drawEarthSpike,
  heavens_drive: drawHeavensDrive,
  quagmire: drawQuagmire,
  sense: drawSense,
  dispell: drawDispell,
  magic_rod: drawMagicRod,
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
