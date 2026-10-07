import type { MinimapWorldRect } from './minimapTypes'

export type MinimapProjectionMode = 'stretch' | 'fit'

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

export function minimapLetterbox(
  view: MinimapWorldRect,
  innerW: number,
  innerH: number,
): { scale: number; offsetX: number; offsetY: number } {
  const vw = Math.max(view.width, 1)
  const vh = Math.max(view.height, 1)
  const scale = Math.min(innerW / vw, innerH / vh)
  const drawnW = vw * scale
  const drawnH = vh * scale
  return {
    scale,
    offsetX: (innerW - drawnW) / 2,
    offsetY: (innerH - drawnH) / 2,
  }
}

export function worldToMinimap(
  wx: number,
  wy: number,
  view: MinimapWorldRect,
  innerW: number,
  innerH: number,
  pad: number,
  mode: MinimapProjectionMode = 'stretch',
): { x: number; y: number } {
  const vw = Math.max(view.width, 1)
  const vh = Math.max(view.height, 1)
  if (mode === 'fit') {
    const { scale, offsetX, offsetY } = minimapLetterbox(view, innerW, innerH)
    return {
      x: pad + offsetX + (wx - view.x) * scale,
      y: pad + offsetY + (wy - view.y) * scale,
    }
  }
  return {
    x: pad + ((wx - view.x) / vw) * innerW,
    y: pad + ((wy - view.y) / vh) * innerH,
  }
}

export function worldRectToMinimap(
  rect: MinimapWorldRect,
  view: MinimapWorldRect,
  innerW: number,
  innerH: number,
  pad: number,
  mode: MinimapProjectionMode = 'stretch',
): { x: number; y: number; width: number; height: number } {
  const vw = Math.max(view.width, 1)
  const vh = Math.max(view.height, 1)
  if (mode === 'fit') {
    const { scale, offsetX, offsetY } = minimapLetterbox(view, innerW, innerH)
    return {
      x: pad + offsetX + (rect.x - view.x) * scale,
      y: pad + offsetY + (rect.y - view.y) * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    }
  }
  const scaleX = innerW / vw
  const scaleY = innerH / vh
  return {
    x: pad + (rect.x - view.x) * scaleX,
    y: pad + (rect.y - view.y) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }
}

export function minimapToWorld(
  mx: number,
  my: number,
  view: MinimapWorldRect,
  innerW: number,
  innerH: number,
  pad: number,
  mode: MinimapProjectionMode = 'stretch',
): { x: number; y: number } {
  const vw = Math.max(view.width, 1)
  const vh = Math.max(view.height, 1)
  if (mode === 'fit') {
    const { scale, offsetX, offsetY } = minimapLetterbox(view, innerW, innerH)
    return {
      x: view.x + (mx - pad - offsetX) / scale,
      y: view.y + (my - pad - offsetY) / scale,
    }
  }
  return {
    x: view.x + ((mx - pad) / innerW) * vw,
    y: view.y + ((my - pad) / innerH) * vh,
  }
}
