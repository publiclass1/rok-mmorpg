/** Keep world coordinates inside map pixel bounds (with edge padding). */
export function clampToMap(
  x: number,
  y: number,
  worldW: number,
  worldH: number,
  padding = 24,
): { x: number; y: number } {
  const maxX = Math.max(padding, worldW - padding)
  const maxY = Math.max(padding, worldH - padding)
  return {
    x: Math.min(Math.max(x, padding), maxX),
    y: Math.min(Math.max(y, padding), maxY),
  }
}
