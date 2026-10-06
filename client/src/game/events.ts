import type { CharacterSessionState, EquipSlot, PrimaryStat, SessionInventorySlot } from './character/characterState'
import type { NpcRow } from '../types/database'

export type PositionPayload = {
  characterId: string
  name: string
  x: number
  y: number
  facing: 'up' | 'down' | 'left' | 'right'
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
}

export type GameEvents = {
  position: { x: number; y: number; mapId: string }
  npcNearby: NpcRow | null
  npcInteract: NpcRow
  remotePlayers: Array<{ characterId: string; name: string; x: number; y: number }>
  status: string
  playerStats: PlayerStatsPayload
  characterSheet: CharacterSheetPayload
  useSkillSlot: { slot: number }
  characterAction: CharacterActionPayload
  uiPointerLock: boolean
  selectedMob: SelectedMobPayload | null
  activityLog: ActivityLogEntry
  sessionSync: CharacterSessionState
  worldReady: { mapId: string }
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
