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

export const PORING: MobDefinition = {
  id: 'poring',
  name: 'Poring',
  level: 1,
  maxHp: 30,
  color: 0xf472b6,
  aggroRange: 140,
  attackRange: 36,
  attackDamage: 4,
  attackCooldownMs: 1200,
  roamRadius: 96,
  moveSpeed: 55,
  wanderPauseMs: 2000,
  baseExp: 15,
  jobExp: 5,
}

export type MobSpawnPoint = { x: number; y: number; defId: string }

export const MOB_SPAWNS_BY_MAP: Record<string, MobSpawnPoint[]> = {
  field_01: [
    { x: 400, y: 280, defId: 'poring' },
    { x: 560, y: 240, defId: 'poring' },
    { x: 720, y: 400, defId: 'poring' },
    { x: 480, y: 480, defId: 'poring' },
  ],
}

export const MOB_DEFS: Record<string, MobDefinition> = {
  poring: PORING,
}

export const PLAYER_DEFAULT_HP = 50
export const PLAYER_DEFAULT_MP = 30
export const ATTACK_DAMAGE = 10
export const ATTACK_RANGE = 56
export const ATTACK_COOLDOWN_MS = 450
export const MOB_RESPAWN_MS = 8000
