import { MOB_DEFS, MOB_SPAWNS_BY_MAP } from './mobConfig'
import type { AutoAttackMobFilter, AutoAttackMovementMode } from './autoAttackConfig'

export type AutoAttackMobCandidate = {
  defId: string
  spawnIndex: number
  alive: boolean
  x: number
  y: number
}

export type MobOnMapEntry = {
  defId: string
  name: string
}

export function mobsOnMap(mapId: string): MobOnMapEntry[] {
  const spawns = MOB_SPAWNS_BY_MAP[mapId] ?? []
  const seen = new Set<string>()
  const out: MobOnMapEntry[] = []
  for (const s of spawns) {
    if (seen.has(s.defId)) continue
    seen.add(s.defId)
    const def = MOB_DEFS[s.defId]
    out.push({ defId: s.defId, name: def?.name ?? s.defId })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

export function mobPassesFilter(defId: string, filter: AutoAttackMobFilter): boolean {
  if (filter.all) return true
  const narrowed = filter as { all: false; defIds: string[] }
  return narrowed.defIds.includes(defId)
}

export function mobFilterDefIds(filter: AutoAttackMobFilter): string[] {
  if (filter.all) return []
  return (filter as { all: false; defIds: string[] }).defIds
}

export function isInsidePatrolAnchor(
  x: number,
  y: number,
  anchorX: number,
  anchorY: number,
  patrolRadiusPx: number,
): boolean {
  const dx = x - anchorX
  const dy = y - anchorY
  return dx * dx + dy * dy <= patrolRadiusPx * patrolRadiusPx
}

export function pickAutoAttackTarget(args: {
  playerX: number
  playerY: number
  anchorX: number
  anchorY: number
  mobs: AutoAttackMobCandidate[]
  filter: AutoAttackMobFilter
  movementMode: AutoAttackMovementMode
  patrolRadiusPx: number
  attackRangePx: number
  skillRangePx?: number
}): AutoAttackMobCandidate | null {
  const rangePx = Math.max(args.attackRangePx, args.skillRangePx ?? args.attackRangePx)
  let best: AutoAttackMobCandidate | null = null
  let bestDist = Infinity

  for (const mob of args.mobs) {
    if (!mob.alive) continue
    if (!mobPassesFilter(mob.defId, args.filter)) continue

    if (args.movementMode === 'patrol_range') {
      if (!isInsidePatrolAnchor(mob.x, mob.y, args.anchorX, args.anchorY, args.patrolRadiusPx)) {
        continue
      }
    }

    const dx = mob.x - args.playerX
    const dy = mob.y - args.playerY
    const dist = Math.hypot(dx, dy)

    if (args.movementMode === 'stay_still' && dist > rangePx) {
      continue
    }

    if (dist < bestDist) {
      bestDist = dist
      best = mob
    }
  }

  return best
}

/** Nearest eligible mob inside patrol (for pathing), regardless of attack range. */
export function pickPatrolChaseTarget(args: {
  playerX: number
  playerY: number
  anchorX: number
  anchorY: number
  mobs: AutoAttackMobCandidate[]
  filter: AutoAttackMobFilter
  patrolRadiusPx: number
}): AutoAttackMobCandidate | null {
  let best: AutoAttackMobCandidate | null = null
  let bestDist = Infinity

  for (const mob of args.mobs) {
    if (!mob.alive) continue
    if (!mobPassesFilter(mob.defId, args.filter)) continue
    if (!isInsidePatrolAnchor(mob.x, mob.y, args.anchorX, args.anchorY, args.patrolRadiusPx)) {
      continue
    }
    const dist = Math.hypot(mob.x - args.playerX, mob.y - args.playerY)
    if (dist < bestDist) {
      bestDist = dist
      best = mob
    }
  }
  return best
}
