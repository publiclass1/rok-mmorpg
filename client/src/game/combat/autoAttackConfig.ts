export type AutoAttackMovementMode = 'stay_still' | 'patrol_range'

export type AutoAttackMobFilter =
  | { all: true }
  | { all: false; defIds: string[] }

export type AutoAttackConfig = {
  enabled: boolean
  rotation: (string | null)[]
  sitSpPercent: number
  redPotionEnabled: boolean
  redPotionHpPercent: number
  bluePotionEnabled: boolean
  bluePotionSpPercent: number
  movementMode: AutoAttackMovementMode
  patrolRadiusPx: number
  mobFilter: AutoAttackMobFilter
}

export const AUTO_ATTACK_ROTATION_SLOTS = 9

export const AUTO_ATTACK_PATROL_RADIUS_MIN = 80
export const AUTO_ATTACK_PATROL_RADIUS_MAX = 600
export const AUTO_ATTACK_PATROL_RADIUS_DEFAULT = 200

export const AUTO_ATTACK_SIT_STAND_BUFFER_PERCENT = 10

const STORAGE_PREFIX = 'autoAttack:v1:'

export function defaultAutoAttackConfig(): AutoAttackConfig {
  const rotation: (string | null)[] = Array.from({ length: AUTO_ATTACK_ROTATION_SLOTS }, () => null)
  rotation[0] = 'basic_attack'
  return {
    enabled: false,
    rotation,
    sitSpPercent: 25,
    redPotionEnabled: true,
    redPotionHpPercent: 50,
    bluePotionEnabled: true,
    bluePotionSpPercent: 40,
    movementMode: 'patrol_range',
    patrolRadiusPx: AUTO_ATTACK_PATROL_RADIUS_DEFAULT,
    mobFilter: { all: true },
  }
}

function clampPercent(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)))
}

function normalizeRotation(raw: unknown): (string | null)[] {
  const base = defaultAutoAttackConfig().rotation
  if (!Array.isArray(raw)) return base
  for (let i = 0; i < AUTO_ATTACK_ROTATION_SLOTS; i++) {
    const v = raw[i]
    base[i] = typeof v === 'string' && v.length > 0 ? v : null
  }
  return base
}

function normalizeMobFilter(raw: unknown): AutoAttackMobFilter {
  if (!raw || typeof raw !== 'object') return { all: true }
  const o = raw as { all?: boolean; defIds?: unknown }
  if (o.all === true) return { all: true }
  const ids = Array.isArray(o.defIds)
    ? o.defIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  return { all: false, defIds: ids }
}

export function normalizeAutoAttackConfig(partial: Partial<AutoAttackConfig> | null | undefined): AutoAttackConfig {
  const d = defaultAutoAttackConfig()
  if (!partial) return d
  const patrolRadiusPx =
    typeof partial.patrolRadiusPx === 'number'
      ? Math.max(
          AUTO_ATTACK_PATROL_RADIUS_MIN,
          Math.min(AUTO_ATTACK_PATROL_RADIUS_MAX, Math.round(partial.patrolRadiusPx)),
        )
      : d.patrolRadiusPx
  const movementMode =
    partial.movementMode === 'stay_still' || partial.movementMode === 'patrol_range'
      ? partial.movementMode
      : d.movementMode
  return {
    enabled: partial.enabled === true,
    rotation: normalizeRotation(partial.rotation),
    sitSpPercent: typeof partial.sitSpPercent === 'number' ? clampPercent(partial.sitSpPercent) : d.sitSpPercent,
    redPotionEnabled: partial.redPotionEnabled !== false,
    redPotionHpPercent:
      typeof partial.redPotionHpPercent === 'number'
        ? clampPercent(partial.redPotionHpPercent)
        : d.redPotionHpPercent,
    bluePotionEnabled: partial.bluePotionEnabled !== false,
    bluePotionSpPercent:
      typeof partial.bluePotionSpPercent === 'number'
        ? clampPercent(partial.bluePotionSpPercent)
        : d.bluePotionSpPercent,
    movementMode,
    patrolRadiusPx,
    mobFilter: normalizeMobFilter(partial.mobFilter),
  }
}

export function loadAutoAttackConfig(characterId: string): AutoAttackConfig {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${characterId}`)
    if (!raw) return defaultAutoAttackConfig()
    return normalizeAutoAttackConfig(JSON.parse(raw) as Partial<AutoAttackConfig>)
  } catch {
    return defaultAutoAttackConfig()
  }
}

export function saveAutoAttackConfig(characterId: string, config: AutoAttackConfig): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${characterId}`, JSON.stringify(normalizeAutoAttackConfig(config)))
  } catch {
    /* ignore quota / private mode */
  }
}

export function autoAttackSkillAllowedInRotation(skillId: string): boolean {
  if (skillId === 'sit' || skillId === 'play_dead') return false
  return true
}
