import type { DuelCombatSnapshot } from './duel/duelCombatSnapshot'
import type { PvpKillStreakKind } from './world/pvpConfig'
import type { CharacterAppearance } from './character/characterAppearance'
import type { CombatStatPreview } from './character/combatStatPreview'
import type { CharacterSessionState, EquipSlot, PrimaryStat, SessionInventorySlot } from './character/characterState'
import type { CharacterPose } from './character/characterPose'
import type { NpcRow } from '../types/database'
import type { MinimapPayload } from './world/minimapTypes'
import type { AutoAttackConfig } from './combat/autoAttackConfig'

/** Phaser ↔ React session handoff; set `persist: false` when hydrating from DB (avoid overwriting server). */
export type SessionSyncPayload = {
  state: CharacterSessionState
  persist?: boolean
}

export function sessionSyncPayload(
  state: CharacterSessionState,
  options?: { persist?: boolean },
): SessionSyncPayload {
  return { state, persist: options?.persist ?? true }
}

export type PositionPayload = {
  characterId: string
  name: string
  x: number
  y: number
  facing: CharacterPose['facing']
}

/** Map presence broadcast: position, pose, and equipment for remote avatars. */
export type PlayerPresencePayload = PositionPayload & {
  /** Map this position applies to; peers ignore mismatched mapId on the same channel. */
  mapId: string
  anim: CharacterPose['anim']
  walkFrame: 0 | 1
  mounted?: boolean
  jobId: string
  equipment: Record<EquipSlot, string | null>
  appearance: CharacterAppearance
  guildTag?: string | null
  isVending?: boolean
  stallTitle?: string | null
  /** Present on PVP maps for damage calculation against this player. */
  pvpSnapshot?: DuelCombatSnapshot | null
  baseLevel: number
  hp: number
  hpMax: number
  mp: number
  mpMax: number
}

export type RemotePlayerHudInfo = {
  characterId: string
  name: string
  x: number
  y: number
  isVending?: boolean
  stallTitle?: string | null
  jobId?: string
  appearance?: CharacterAppearance
  baseLevel?: number
  hp?: number
  hpMax?: number
  mp?: number
  mpMax?: number
}

export type SelectedPlayerPayload = {
  characterId: string
  name: string
  isVending?: boolean
  stallTitle?: string | null
  menuMode?: 'left' | 'right'
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

export type DuelSyncPayload = {
  duelSessionId: string
  opponentCharacterId: string
  opponentSnapshot: DuelCombatSnapshot | null
  fightStartsAt: number | null
  state: DuelSessionRowState
  winnerCharacterId?: string | null
}

export type DuelSessionRowState =
  | 'pending'
  | 'countdown'
  | 'active'
  | 'completed'
  | 'declined'
  | 'cancelled'

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

export type PlayerBuffDisplayKind = 'buff' | 'status'

export type PlayerBuffPayload = {
  statusId: string
  name: string
  iconSkillId: string
  iconItemId?: string
  skillLevel: number
  expiresAt: number
  durationMs: number
  /** Timed combat buffs use 'buff' (duration ring). Mounts and rentals use 'status'. */
  displayKind?: PlayerBuffDisplayKind
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
  skillBars: (string | null)[][]
  sessionInventory: SessionInventorySlot[]
  attackDamage: number
  combatStats: CombatStatPreview
}

export type CharacterActionPayload =
  | { type: 'raiseStat'; stat: PrimaryStat }
  | { type: 'resetStats' }
  | { type: 'resetSkills' }
  | { type: 'learnSkill'; skillId: string }
  | { type: 'changeJob'; jobId: string }
  | { type: 'assignSkillBar'; bar: number; slot: number; skillId: string | null }
  | { type: 'moveSkillBar'; fromBar: number; fromSlot: number; toBar: number; toSlot: number }
  | { type: 'equip'; slot: EquipSlot; itemId: string | null; sessionInventoryIndex?: number }
  | { type: 'useConsumable'; sessionInventoryIndex: number }
  | { type: 'shopAddItems'; itemId: string; quantity: number }
  | { type: 'shopRemoveItem'; itemId: string; quantity: number }
  | { type: 'restoreVitals' }
  | { type: 'respawnPartial' }
  | { type: 'rentEquipment'; kind: 'cart' | 'peco_peco' | 'falcon' }
  | { type: 'dismissRental' }

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
  remotePlayers: RemotePlayerHudInfo[]
  selectedPlayer: SelectedPlayerPayload | null
  selectedPlayerAnchor: { x: number; y: number } | null
  clearSelectedPlayer: Record<string, never>
  partySync: PartySyncPayload
  duelSync: DuelSyncPayload | null
  duelCompleteRequest: { duelSessionId: string; winnerCharacterId: string }
  socialPresence: SocialPresencePayload
  status: string
  playerStats: PlayerStatsPayload
  playerBuffs: PlayerBuffPayload[]
  characterSheet: CharacterSheetPayload
  useSkillSlot: { bar: number; slot: number }
  characterAction: CharacterActionPayload
  uiPointerLock: boolean
  uiKeyboardLock: boolean
  chatBubble: { characterId: string; text: string }
  selectedMob: SelectedMobPayload | null
  activityLog: ActivityLogEntry
  sessionSync: SessionSyncPayload
  potionBuffUsed: { itemId: string }
  jobChange: { jobId: string; jobName: string }
  progressSaveError: { message: string }
  worldReady: { mapId: string }
  worldLoadProgress: { mapId: string; progress: number }
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
  characterZenySync: { zeny: number }
  adminLevelUp: { baseGained: number; jobGained: number; beforeBase: number; beforeJob: number }
  duelHpSync: { hp: number }
  playerDeath: Record<string, never>
  pvpDeath: { mapId: string }
  pvpAnnounce: {
    announceId: number
    streak: PvpKillStreakKind | null
    killerCharacterId: string
    killerName: string
    victimName: string
  }
  playerRevived: { x: number; y: number }
  pvpRespawnInArena: { x: number; y: number }
  pvpRespawned: { x: number; y: number }
  pvpAttackRequest: { characterId: string }
  dungeonSync: DungeonSyncPayload
  dungeonMobKilled: { instanceId: string; spawnIndex: number }
  dungeonMvpKilled: { instanceId: string }
  mapDropHover: { itemId: string; screenX: number; screenY: number } | null
  autoAttackSync: AutoAttackConfig
  autoAttackToggle: { enabled: boolean }
  autoAttackDisable: Record<string, never>
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
