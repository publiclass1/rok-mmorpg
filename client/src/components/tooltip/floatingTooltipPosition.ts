const DEFAULT_WIDTH = 260
const DEFAULT_HEIGHT = 200
const VIEWPORT_PAD = 8
const GAP = 8

export function floatingTooltipPosition(
  anchor: DOMRect,
  preferredWidth = DEFAULT_WIDTH,
  tooltipHeight = DEFAULT_HEIGHT,
): { left: number; top: number; maxWidth: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxWidth = Math.min(preferredWidth, vw - VIEWPORT_PAD * 2)
  const height = Math.max(1, tooltipHeight)

  let left = anchor.right + GAP
  if (left + maxWidth > vw - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, anchor.left - maxWidth - GAP)
  }
  if (left < VIEWPORT_PAD) {
    left = VIEWPORT_PAD
  }

  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD
  const spaceAbove = anchor.top - VIEWPORT_PAD
  const needsBelow = height + GAP
  let top: number

  if (needsBelow <= spaceBelow) {
    top = anchor.top
  } else if (height + GAP <= spaceAbove) {
    top = anchor.top - height - GAP
  } else if (spaceBelow >= spaceAbove) {
    top = anchor.bottom + GAP
  } else {
    top = anchor.top - height - GAP
  }

  top = Math.min(Math.max(top, VIEWPORT_PAD), vh - height - VIEWPORT_PAD)

  return { left, top, maxWidth }
}

/** Position a floating tooltip near a screen point (e.g. Phaser canvas hover). */
export function floatingTooltipPositionFromPoint(
  screenX: number,
  screenY: number,
  preferredWidth = DEFAULT_WIDTH,
  tooltipHeight = DEFAULT_HEIGHT,
): { left: number; top: number; maxWidth: number } {
  const pad = 4
  const anchor = new DOMRect(screenX - pad, screenY - pad, pad * 2, pad * 2)
  return floatingTooltipPosition(anchor, preferredWidth, tooltipHeight)
}
