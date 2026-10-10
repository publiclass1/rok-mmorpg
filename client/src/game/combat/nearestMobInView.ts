import type { ViewBounds } from '../world/viewportCull'
import { pointInView } from '../world/viewportCull'

export type MobInViewCandidate<T> = {
  mob: T
  alive: boolean
  x: number
  y: number
}

export function pickNearestMobInView<T>(args: {
  playerX: number
  playerY: number
  view: ViewBounds
  candidates: MobInViewCandidate<T>[]
}): T | null {
  let best: T | null = null
  let bestDist = Infinity

  for (const c of args.candidates) {
    if (!c.alive) continue
    if (!pointInView(c.x, c.y, args.view)) continue
    const dist = Math.hypot(c.x - args.playerX, c.y - args.playerY)
    if (dist < bestDist) {
      bestDist = dist
      best = c.mob
    }
  }

  return best
}
