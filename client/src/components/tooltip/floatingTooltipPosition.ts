const DEFAULT_WIDTH = 260
const VIEWPORT_PAD = 8
const GAP = 8

export function floatingTooltipPosition(
  anchor: DOMRect,
  preferredWidth = DEFAULT_WIDTH,
): { left: number; top: number; maxWidth: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxWidth = Math.min(preferredWidth, vw - VIEWPORT_PAD * 2)

  let left = anchor.right + GAP
  if (left + maxWidth > vw - VIEWPORT_PAD) {
    left = Math.max(VIEWPORT_PAD, anchor.left - maxWidth - GAP)
  }
  if (left < VIEWPORT_PAD) {
    left = VIEWPORT_PAD
  }

  let top = anchor.top
  const estimatedHeight = 200
  if (top + estimatedHeight > vh - VIEWPORT_PAD) {
    top = Math.max(VIEWPORT_PAD, vh - estimatedHeight - VIEWPORT_PAD)
  }
  if (top < VIEWPORT_PAD) {
    top = VIEWPORT_PAD
  }

  return { left, top, maxWidth }
}
