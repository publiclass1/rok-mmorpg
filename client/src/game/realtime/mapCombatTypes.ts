import type { CharacterPose } from '../character/characterPose'
import type { PvpKillStreakKind } from '../world/pvpConfig'

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
      critical?: boolean
      criticalMagic?: boolean
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
  | {
      kind: 'player_hit'
      characterId: string
      targetCharacterId: string
      damage: number
      skillLabel?: string
      critical?: boolean
    }
  | {
      kind: 'player_miss'
      characterId: string
      targetCharacterId: string
      x: number
      y: number
    }
  | {
      kind: 'player_die'
      characterId: string
      killerCharacterId?: string
      x: number
      y: number
    }
  | {
      kind: 'map_drop'
      dropId: string
      itemId: string
      x: number
      y: number
      fromCharacterId?: string
      ownerCharacterId?: string
      availableAt?: string
      expiresAt?: string
    }
  | {
      kind: 'map_pickup'
      dropId: string
      characterId: string
    }
  | {
      kind: 'pvp_announce'
      announceId: number
      streak: PvpKillStreakKind | null
      killerCharacterId: string
      killerName: string
      victimName: string
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
      critical: o.critical === true ? true : undefined,
      criticalMagic: o.criticalMagic === true ? true : undefined,
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
  if (kind === 'player_hit') {
    if (typeof o.characterId !== 'string' || typeof o.targetCharacterId !== 'string') return null
    return {
      kind: 'player_hit',
      characterId: o.characterId,
      targetCharacterId: o.targetCharacterId,
      damage: typeof o.damage === 'number' ? o.damage : 0,
      skillLabel: typeof o.skillLabel === 'string' ? o.skillLabel : undefined,
      critical: o.critical === true ? true : undefined,
    }
  }
  if (kind === 'player_miss') {
    if (typeof o.characterId !== 'string' || typeof o.targetCharacterId !== 'string') return null
    return {
      kind: 'player_miss',
      characterId: o.characterId,
      targetCharacterId: o.targetCharacterId,
      x: typeof o.x === 'number' ? o.x : 0,
      y: typeof o.y === 'number' ? o.y : 0,
    }
  }
  if (kind === 'player_die') {
    if (typeof o.characterId !== 'string') return null
    return {
      kind: 'player_die',
      characterId: o.characterId,
      killerCharacterId: typeof o.killerCharacterId === 'string' ? o.killerCharacterId : undefined,
      x: typeof o.x === 'number' ? o.x : 0,
      y: typeof o.y === 'number' ? o.y : 0,
    }
  }
  if (kind === 'map_drop') {
    if (typeof o.dropId !== 'string' || typeof o.itemId !== 'string') return null
    return {
      kind: 'map_drop',
      dropId: o.dropId,
      itemId: o.itemId,
      x: typeof o.x === 'number' ? o.x : 0,
      y: typeof o.y === 'number' ? o.y : 0,
      fromCharacterId: typeof o.fromCharacterId === 'string' ? o.fromCharacterId : undefined,
      ownerCharacterId: typeof o.ownerCharacterId === 'string' ? o.ownerCharacterId : undefined,
      availableAt: typeof o.availableAt === 'string' ? o.availableAt : undefined,
      expiresAt: typeof o.expiresAt === 'string' ? o.expiresAt : undefined,
    }
  }
  if (kind === 'map_pickup') {
    if (typeof o.dropId !== 'string' || typeof o.characterId !== 'string') return null
    return { kind: 'map_pickup', dropId: o.dropId, characterId: o.characterId }
  }
  if (kind === 'pvp_announce') {
    const rawStreak = o.streak
    let streak: PvpKillStreakKind | null = null
    if (rawStreak != null) {
      if (
        rawStreak !== 'first_blood' &&
        rawStreak !== 'double' &&
        rawStreak !== 'triple' &&
        rawStreak !== 'ultra' &&
        rawStreak !== 'rampage'
      ) {
        return null
      }
      streak = rawStreak
    }
    if (
      typeof o.announceId !== 'number' ||
      typeof o.killerCharacterId !== 'string' ||
      typeof o.killerName !== 'string' ||
      typeof o.victimName !== 'string'
    ) {
      return null
    }
    return {
      kind: 'pvp_announce',
      announceId: o.announceId,
      streak,
      killerCharacterId: o.killerCharacterId,
      killerName: o.killerName,
      victimName: o.victimName,
    }
  }
  return null
}
