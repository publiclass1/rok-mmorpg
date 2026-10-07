import type { CharacterAppearance } from './character/characterAppearance'
import type { CharacterSessionState, EquipSlot, PrimaryStat, SessionInventorySlot } from './character/characterState'
import type { CharacterPose } from './character/characterPose'
import type { NpcRow } from '../types/database'
import type { MinimapPayload } from './world/minimapTypes'

export type PositionPayload = {
  characterId: string
  name: string
  x: number
  y: number
  facing: CharacterPose['facing']
}

/** Map presence broadcast: position, pose, and equipment for remote avatars. */
export type PlayerPresencePayload = PositionPayload & {
  anim: CharacterPose['anim']
  walkFrame: 0 | 1
  equipment: Record<EquipSlot, string | null>
  appearance: CharacterAppearance
  guildTag?: string | null
  isVending?: boolean
  stallTitle?: string | null
}

export type SelectedPlayerPayload = {
  characterId: string
  name: string
  isVending?: boolean
  stallTitle?: string | null
}

export type DungeonSyncPayload = {
  instanceId: string
  floorId: string
  mapId: string
  killedSpawns: number[]
  mvpAlive: boolean
  status: 'active' | 'mvp' | 'cleared'
}

export type PartySyncPayload = {
  partyId: string | null
  leaderCharacterId: string | null
  expShare: boolean
  memberCharacterIds: string[]
  myCharacterId: string
}

export type SocialPresencePayload = {
  guildTag?: string | null
  isVending?: boolean
  stallTitle?: string | null
}

export type PartyExpGrantPayload = {
  killerCharacterId: string
  baseExp: number
  jobExp: number
  mapId: string
  x: number
  y: number
  at: number
}

export type PlayerStatsPayload = {
  hp: number
  hpMax: number
  mp: number
  mpMax: number
  baseLevel: number
  baseExp: number
  baseExpToNext: number
  jobLevel: number
  jobExp: number
  jobExpToNext: number
}

export type PlayerBuffPayload = {
  statusId: string
  name: string
  iconSkillId: string
  skillLevel: number
  expiresAt: number
  durationMs: number
}

export type CharacterSheetPayload = PlayerStatsPayload & {
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
  effectiveStr: number
  effectiveAgi: number
  effectiveVit: number
  effectiveInt: number
  effectiveDex: number
  effectiveLuk: number
  statPointsUnspent: number
  statRaiseCosts: Record<PrimaryStat, number>
  jobId: string
  skillPointsUnspent: number
  skills: Record<string, number>
  equipment: Record<EquipSlot, string | null>
  skillBar: (string | null)[]
  sessionInventory: SessionInventorySlot[]
  attackDamage: number
}

export type CharacterActionPayload =
  | { type: 'raiseStat'; stat: PrimaryStat }
  | { type: 'learnSkill'; skillId: string }
  | { type: 'changeJob'; jobId: string }
  | { type: 'assignSkillBar'; slot: number; skillId: string | null }
  | { type: 'moveSkillBar'; from: number; to: number }
  | { type: 'equip'; slot: EquipSlot; itemId: string | null; sessionInventoryIndex?: number }
  | { type: 'useConsumable'; sessionInventoryIndex: number }
  | { type: 'shopAddItems'; itemId: string; quantity: number }
  | { type: 'shopRemoveItem'; itemId: string; quantity: number }
  | { type: 'restoreVitals' }
  | { type: 'respawnPartial' }

export type SelectedMobPayload = {
  defId: string
  name: string
  level: number
  hp: number
  hpMax: number
}

export type ActivityLogKind = 'combat' | 'exp' | 'level' | 'target' | 'character' | 'system'

export type ActivityLogEntry = {
  id: string
  at: number
  kind: ActivityLogKind
  message: string
  itemId?: string
}

export type GameEvents = {
  position: { x: number; y: number; mapId: string }
  npcNearby: NpcRow | null
  npcInteract: NpcRow
  remotePlayers: Array<{
    characterId: string
    name: string
    x: number
    y: number
    isVending?: boolean
    stallTitle?: string | null
  }>
  selectedPlayer: SelectedPlayerPayload | null
  selectedPlayerAnchor: { x: number; y: number } | null
  partySync: PartySyncPayload
  socialPresence: SocialPresencePayload
  status: string
  playerStats: PlayerStatsPayload
  playerBuffs: PlayerBuffPayload[]
  characterSheet: CharacterSheetPayload
  useSkillSlot: { slot: number }
  characterAction: CharacterActionPayload
  uiPointerLock: boolean
  selectedMob: SelectedMobPayload | null
  activityLog: ActivityLogEntry
  sessionSync: CharacterSessionState
  worldReady: { mapId: string }
  minimapUi: { expanded: boolean }
  minimapMove: { x: number; y: number }
  minimap: MinimapPayload
  portalWarpRequest: {
    portalId: string
    mapId: string
    x: number
    y: number
    label: string
    destinationMapId: string
  }
  partyExpBroadcast: Omit<PartyExpGrantPayload, 'at'>
  partyExpGrant: PartyExpGrantPayload
  vendorPosSync: { mapId: string; x: number; y: number }
  zenyGain: { amount: number }
  playerDeath: Record<string, never>
  playerRevived: { x: number; y: number }
  dungeonSync: DungeonSyncPayload
  dungeonMobKilled: { instanceId: string; spawnIndex: number }
  dungeonMvpKilled: { instanceId: string }
}

type Listener = (payload: unknown) => void

const listeners: Record<string, Set<Listener>> = {}

export function onGameEvent<K extends keyof GameEvents>(event: K, fn: (payload: GameEvents[K]) => void) {
  if (!listeners[event]) listeners[event] = new Set()
  listeners[event].add(fn as Listener)
  return () => listeners[event].delete(fn as Listener)
}

export function emitGameEvent<K extends keyof GameEvents>(event: K, payload: GameEvents[K]) {
  listeners[event]?.forEach((fn) => fn(payload))
}
