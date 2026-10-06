import { loadRoContent } from '../../content/ro/loadContent'
import { parseLayerColor } from '../../content/ro/parseColor'
import type { RoMob } from '../../content/ro/types'

export type MobDefinition = {
  id: string
  name: string
  level: number
  maxHp: number
  color: number
  aggroRange: number
  attackRange: number
  attackDamage: number
  attackCooldownMs: number
  roamRadius: number
  moveSpeed: number
  wanderPauseMs: number
  baseExp: number
  jobExp: number
}

function mobDefinitionFromContent(mob: RoMob): MobDefinition {
  const r = mob.runtime
  return {
    id: mob.id,
    name: mob.name,
    level: mob.level,
    maxHp: r.maxHp,
    color: parseLayerColor(r.color),
    aggroRange: r.aggroRange,
    attackRange: r.attackRange,
    attackDamage: r.attackDamage,
    attackCooldownMs: r.attackCooldownMs,
    roamRadius: r.roamRadius,
    moveSpeed: r.moveSpeed,
    wanderPauseMs: r.wanderPauseMs,
    baseExp: r.baseExp,
    jobExp: r.jobExp,
  }
}

const ro = loadRoContent()

export const MOB_DEFS: Record<string, MobDefinition> = Object.fromEntries(
  ro.mobs.map((mob) => [mob.id, mobDefinitionFromContent(mob)]),
)

export const PORING = MOB_DEFS.poring

export type MobSpawnPoint = { x: number; y: number; defId: string }

export const MOB_SPAWNS_BY_MAP: Record<string, MobSpawnPoint[]> = ro.mobSpawns

export const PLAYER_DEFAULT_HP = 50
export const PLAYER_DEFAULT_MP = 30
export const ATTACK_DAMAGE = 10
export const ATTACK_RANGE = 56
export const ATTACK_COOLDOWN_MS = 450
export const MOB_RESPAWN_MS = 8000
