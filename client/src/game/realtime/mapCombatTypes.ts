import type { CharacterPose } from '../character/characterPose'

export type MapCombatSkillId = 'basic_attack' | 'bash'

export type MapCombatPayload =
  | {
      kind: 'player_action'
      characterId: string
      facing: CharacterPose['facing']
      x: number
      y: number
      skillId: MapCombatSkillId
    }
  | {
      kind: 'mob_hit'
      characterId: string
      spawnIndex: number
      damage: number
      hpAfter: number
      skillLabel?: string
    }
  | {
      kind: 'mob_miss'
      characterId: string
      spawnIndex?: number
      x: number
      y: number
    }
  | {
      kind: 'mob_die'
      characterId: string
      spawnIndex: number
    }
  | {
      kind: 'mob_respawn'
      spawnIndex: number
    }

export function normalizeMapCombatPayload(raw: unknown): MapCombatPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.kind
  if (kind === 'player_action') {
    if (typeof o.characterId !== 'string') return null
    const skillId = o.skillId === 'bash' ? 'bash' : 'basic_attack'
    const facing = o.facing
    if (facing !== 'up' && facing !== 'down' && facing !== 'left' && facing !== 'right') return null
    return {
      kind: 'player_action',
      characterId: o.characterId,
      facing,
      x: typeof o.x === 'number' ? o.x : 0,
      y: typeof o.y === 'number' ? o.y : 0,
      skillId,
    }
  }
  if (kind === 'mob_hit') {
    if (typeof o.characterId !== 'string' || typeof o.spawnIndex !== 'number') return null
    return {
      kind: 'mob_hit',
      characterId: o.characterId,
      spawnIndex: o.spawnIndex,
      damage: typeof o.damage === 'number' ? o.damage : 0,
      hpAfter: typeof o.hpAfter === 'number' ? o.hpAfter : 0,
      skillLabel: typeof o.skillLabel === 'string' ? o.skillLabel : undefined,
    }
  }
  if (kind === 'mob_miss') {
    if (typeof o.characterId !== 'string') return null
    return {
      kind: 'mob_miss',
      characterId: o.characterId,
      spawnIndex: typeof o.spawnIndex === 'number' ? o.spawnIndex : undefined,
      x: typeof o.x === 'number' ? o.x : 0,
      y: typeof o.y === 'number' ? o.y : 0,
    }
  }
  if (kind === 'mob_die') {
    if (typeof o.characterId !== 'string' || typeof o.spawnIndex !== 'number') return null
    return { kind: 'mob_die', characterId: o.characterId, spawnIndex: o.spawnIndex }
  }
  if (kind === 'mob_respawn') {
    if (typeof o.spawnIndex !== 'number') return null
    return { kind: 'mob_respawn', spawnIndex: o.spawnIndex }
  }
  return null
}
