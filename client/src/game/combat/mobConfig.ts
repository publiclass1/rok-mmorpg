import { getRuntimeMobSpawnsByMap, loadRoContent } from '../../content/ro/loadContent'
import type { RuntimeMobSpawn } from '../../content/ro/expandMobSpots'
import { parseLayerColor } from '../../content/ro/parseColor'
import type { RoMob, RoMobDrop, RoMobSkill } from '../../content/ro/types'

export type MobDefinition = {
  id: string
  name: string
  level: number
  maxHp: number
  atk: number
  def: number
  mdef: number
  element: string
  size: string
  /** Mob HIT/FLEE helpers derived from level until mob stats exist in content. */
  hit: number
  flee: number
  color: number
  aggroRange: number
  attackRange: number
  attackCooldownMs: number
  roamRadius: number
  moveSpeed: number
  wanderPauseMs: number
  wikiBaseExp: number
  wikiJobExp: number
  drops: RoMobDrop[]
  skills: RoMobSkill[]
  isBoss: boolean
}

function mobDefinitionFromContent(mob: RoMob): MobDefinition {
  const r = mob.runtime
  const level = mob.level
  return {
    id: mob.id,
    name: mob.name,
    level,
    maxHp: r.maxHp,
    atk: r.attackDamage,
    def: mob.def,
    mdef: mob.mdef,
    element: mob.element,
    size: mob.size,
    hit: level + level + Math.floor(level / 2),
    flee: level + Math.floor(level / 2),
    color: parseLayerColor(r.color),
    aggroRange: r.aggroRange,
    attackRange: r.attackRange,
    attackCooldownMs: r.attackCooldownMs,
    roamRadius: r.roamRadius,
    moveSpeed: r.moveSpeed,
    wanderPauseMs: r.wanderPauseMs,
    wikiBaseExp: mob.wikiBaseExp,
    wikiJobExp: mob.wikiJobExp,
    drops: mob.drops,
    skills: mob.skills ?? [],
    isBoss: mob.boss === true,
  }
}

const ro = loadRoContent()

export const MOB_DEFS: Record<string, MobDefinition> = Object.fromEntries(
  ro.mobs.map((mob) => [mob.id, mobDefinitionFromContent(mob)]),
)

export const PORING = MOB_DEFS.poring

export type MobSpawnPoint = RuntimeMobSpawn

export const MOB_SPAWNS_BY_MAP: Record<string, MobSpawnPoint[]> = getRuntimeMobSpawnsByMap()

export const PLAYER_DEFAULT_HP = 50
export const PLAYER_DEFAULT_MP = 30
export const ATTACK_COOLDOWN_MS = 450
export const MOB_RESPAWN_MS = 8000
