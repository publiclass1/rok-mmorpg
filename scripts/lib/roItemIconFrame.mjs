/**
 * Shared 32×32 RO-style inventory icon frame and gradients.
 */

export function defs(id) {
  return `
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#374151"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="35%" stop-color="#cbd5e1"/>
      <stop offset="70%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="${id}-steel-dark" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>
    <linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a16207"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <linearGradient id="${id}-leather" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#78716c"/>
      <stop offset="100%" stop-color="#292524"/>
    </linearGradient>
    <linearGradient id="${id}-cloth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5f5f4"/>
      <stop offset="100%" stop-color="#a8a29e"/>
    </linearGradient>
    <radialGradient id="${id}-gem" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#e9d5ff"/>
      <stop offset="45%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#5b21b6"/>
    </radialGradient>
    <filter id="${id}-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`
}

export function frame(id, accent) {
  return `
  ${defs(id)}
  <rect width="32" height="32" rx="5" fill="url(#${id}-bg)"/>
  <rect x="1" y="1" width="30" height="30" rx="4" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="0.5"/>
  <path d="M4 28 Q16 24 28 28" stroke="#000" stroke-opacity="0.25" stroke-width="1" fill="none"/>`
}

export function wrap(svgBody, id, accent = '#64748b') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${frame(id, accent)}${svgBody}</svg>`
}

/** Parse items.json layerColor `0xrrggbb` to `#rrggbb`. */
export function layerHex(layerColor) {
  if (!layerColor || typeof layerColor !== 'string') return '#9ca3af'
  const raw = layerColor.replace(/^0x/i, '')
  if (raw.length !== 6) return '#9ca3af'
  return `#${raw}`
}

export function safeGradientId(itemId) {
  return itemId.replace(/[^a-z0-9]/gi, '')
}
