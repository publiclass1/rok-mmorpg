import type { MinimapWorldRect } from './minimapTypes'

export function pointInRect(px: number, py: number, rect: MinimapWorldRect): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.width &&
    py >= rect.y &&
    py <= rect.y + rect.height
  )
}

export function rectsIntersect(a: MinimapWorldRect, b: MinimapWorldRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function worldToMinimap(
  wx: number,
  wy: number,
  view: MinimapWorldRect,
  innerSize: number,
  pad: number,
): { x: number; y: number } {
  const vw = Math.max(view.width, 1)
  const vh = Math.max(view.height, 1)
  return {
    x: pad + ((wx - view.x) / vw) * innerSize,
    y: pad + ((wy - view.y) / vh) * innerSize,
  }
}

export function worldRectToMinimap(
  rect: MinimapWorldRect,
  view: MinimapWorldRect,
  innerSize: number,
  pad: number,
): { x: number; y: number; width: number; height: number } {
  const vw = Math.max(view.width, 1)
  const vh = Math.max(view.height, 1)
  const scaleX = innerSize / vw
  const scaleY = innerSize / vh
  return {
    x: pad + (rect.x - view.x) * scaleX,
    y: pad + (rect.y - view.y) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }
}
