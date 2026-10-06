import { addBaseExp, addJobExp, createInitialProgress, type PlayerProgressState } from '../combat/exp'
import { statPointsForReachingBaseLevel } from '../../content/ro/expTables'
import { equipmentBonusesFromState } from './equipmentConfig'
import { getConsumableEffect } from './itemCatalog'
import {
  addItemsToSessionInventory,
  parseSessionInventory,
  removeFromSessionInventory,
  type SessionInventorySlot,
} from './sessionInventory'
import { derivedMaxHp, derivedMaxMp, SKILL_POINTS_PER_JOB_LEVEL, statRaiseCost } from './statFormulas'

export type { SessionInventorySlot } from './sessionInventory'
export { parseSessionInventory } from './sessionInventory'

export type PrimaryStat = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk'

export type EquipSlot =
  | 'weapon'
  | 'headTop'
  | 'headMiddle'
  | 'headLower'
  | 'armor'
  | 'garment'
  | 'boots'
  | 'offhand'
  | 'accLeft'
  | 'accRight'

export const HEAD_EQUIP_SLOTS: EquipSlot[] = ['headTop', 'headMiddle', 'headLower']

export function createDefaultEquipment(): Record<EquipSlot, string | null> {
  return {
    weapon: null,
    headTop: null,
    headMiddle: null,
    headLower: null,
    armor: null,
    garment: null,
    boots: null,
    offhand: null,
    accLeft: null,
    accRight: null,
  }
}

/** Merge persisted/partial equipment into the current slot schema (legacy `head` → headTop). */
export function normalizeEquipment(raw: unknown): Record<EquipSlot, string | null> {
  const base = createDefaultEquipment()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, string | null | undefined>
  for (const slot of Object.keys(base) as EquipSlot[]) {
    const v = obj[slot]
    if (v != null && v !== '') base[slot] = v
  }
  if (obj.head && !base.headTop) base.headTop = obj.head
  return base
}

export function resolveHeadItemId(equipment: Record<EquipSlot, string | null>): string | null {
  for (const slot of HEAD_EQUIP_SLOTS) {
    const id = equipment[slot]
    if (id) return id
  }
  return null
}

export type CharacterSessionState = {
  progress: PlayerProgressState
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
  statPointsUnspent: number
  jobId: string
  skillPointsUnspent: number
  skills: Record<string, number>
  equipment: Record<EquipSlot, string | null>
  skillBar: (string | null)[]
  sessionInventory: SessionInventorySlot[]
  hp: number
  mp: number
}

const DEFAULT_STATS: Record<PrimaryStat, number> = {
  str: 1,
  agi: 1,
  vit: 1,
  int: 1,
  dex: 1,
  luk: 1,
}

export function createInitialCharacterState(): CharacterSessionState {
  return {
    progress: createInitialProgress(),
    ...DEFAULT_STATS,
    statPointsUnspent: 0,
    jobId: 'novice',
    skillPointsUnspent: 0,
    skills: { basic_attack: 1 },
    equipment: createDefaultEquipment(),
    skillBar: ['basic_attack', null, null, null, null, null, null, null, null],
    sessionInventory: parseSessionInventory([
      { itemId: 'red_potion', quantity: 2 },
      'knife',
      'cotton_shirt',
      'cap',
      'goggles',
      'flu_mask',
      'wooden_shield',
      'hooded_mantle',
      'sandals',
      'clip',
      'glove',
    ]),
    hp: 50,
    mp: 30,
  }
}

export function grantBaseLevelRewards(
  state: CharacterSessionState,
  levelsGained: number,
  beforeBaseLevel: number,
): CharacterSessionState {
  if (levelsGained <= 0) return state
  let points = 0
  for (let lv = beforeBaseLevel + 1; lv <= state.progress.baseLevel; lv++) {
    points += statPointsForReachingBaseLevel(lv)
  }
  return {
    ...state,
    statPointsUnspent: state.statPointsUnspent + points,
  }
}

export function grantJobLevelRewards(state: CharacterSessionState, levelsGained: number): CharacterSessionState {
  if (levelsGained <= 0) return state
  return {
    ...state,
    skillPointsUnspent: state.skillPointsUnspent + levelsGained * SKILL_POINTS_PER_JOB_LEVEL,
  }
}

export function raiseStat(state: CharacterSessionState, stat: PrimaryStat): CharacterSessionState {
  const current = state[stat]
  const cost = statRaiseCost(current)
  if (state.statPointsUnspent < cost) return state
  return {
    ...state,
    [stat]: current + 1,
    statPointsUnspent: state.statPointsUnspent - cost,
  }
}

export function addExperience(
  state: CharacterSessionState,
  baseExp: number,
  jobExp: number,
): { state: CharacterSessionState; baseLeveled: number; jobLeveled: number } {
  const beforeBase = state.progress.baseLevel
  const beforeJob = state.progress.jobLevel
  let progress = state.progress
  progress = addBaseExp(progress, baseExp).newState
  progress = addJobExp(progress, jobExp, state.jobId).newState
  let next = { ...state, progress }
  const baseLeveled = progress.baseLevel - beforeBase
  const jobLeveled = progress.jobLevel - beforeJob
  next = grantBaseLevelRewards(next, baseLeveled, beforeBase)
  next = grantJobLevelRewards(next, jobLeveled)
  return { state: next, baseLeveled, jobLeveled }
}

export function learnOrLevelSkill(state: CharacterSessionState, skillId: string, maxLevel: number): CharacterSessionState {
  const current = state.skills[skillId] ?? 0
  if (current >= maxLevel) return state
  if (state.skillPointsUnspent < 1) return state
  return {
    ...state,
    skillPointsUnspent: state.skillPointsUnspent - 1,
    skills: { ...state.skills, [skillId]: current + 1 },
  }
}

export function equipItem(state: CharacterSessionState, slot: EquipSlot, itemId: string | null): CharacterSessionState {
  return {
    ...state,
    equipment: { ...state.equipment, [slot]: itemId },
  }
}

export type EquipTransferResult =
  | { ok: true; state: CharacterSessionState }
  | { ok: false; reason: string }

/** Equip/unequip while moving items between session bag and equipment slots. */
export function equipItemWithInventoryTransfer(
  state: CharacterSessionState,
  slot: EquipSlot,
  itemId: string | null,
  options?: { sessionInventoryIndex?: number },
): EquipTransferResult {
  if (itemId === null) {
    const current = state.equipment[slot]
    if (!current) return { ok: true, state }
    return {
      ok: true,
      state: {
        ...state,
        equipment: { ...state.equipment, [slot]: null },
        sessionInventory: addItemsToSessionInventory(state.sessionInventory, [current]),
      },
    }
  }

  let removeIndex: number
  const inv = state.sessionInventory

  if (options?.sessionInventoryIndex !== undefined) {
    const idx = options.sessionInventoryIndex
    if (idx < 0 || idx >= inv.length || inv[idx].itemId !== itemId) {
      return { ok: false, reason: 'Item not found in inventory at that slot.' }
    }
    removeIndex = idx
  } else {
    removeIndex = inv.findIndex((s) => s.itemId === itemId)
    if (removeIndex < 0) {
      return { ok: false, reason: 'Item is not in your session inventory.' }
    }
  }

  let nextInv = removeFromSessionInventory(inv, removeIndex, 1)
  const displaced = state.equipment[slot]
  if (displaced) nextInv = addItemsToSessionInventory(nextInv, [displaced])

  return {
    ok: true,
    state: {
      ...state,
      sessionInventory: nextInv,
      equipment: { ...state.equipment, [slot]: itemId },
    },
  }
}

export function useConsumableFromSession(
  state: CharacterSessionState,
  sessionInventoryIndex: number,
): { ok: true; state: CharacterSessionState } | { ok: false; reason: string } {
  const inv = state.sessionInventory
  if (sessionInventoryIndex < 0 || sessionInventoryIndex >= inv.length) {
    return { ok: false, reason: 'Invalid inventory slot.' }
  }
  const itemId = inv[sessionInventoryIndex].itemId
  const effect = getConsumableEffect(itemId)
  if (!effect) return { ok: false, reason: 'Item is not usable.' }

  const bonuses = equipmentBonusesFromState(state.equipment)
  const vit = state.vit + bonuses.vit
  const int = state.int + bonuses.int
  const hpMax = derivedMaxHp(state.jobId, state.progress.baseLevel, vit)
  const mpMax = derivedMaxMp(state.jobId, state.progress.baseLevel, int)

  let hp = state.hp
  let mp = state.mp
  if (effect.healHp) hp = Math.min(hpMax, hp + effect.healHp)
  if (effect.healSp) mp = Math.min(mpMax, mp + effect.healSp)

  const nextInv = removeFromSessionInventory(inv, sessionInventoryIndex, 1)
  return {
    ok: true,
    state: { ...state, sessionInventory: nextInv, hp, mp },
  }
}

export function assignSkillBarSlot(state: CharacterSessionState, index: number, skillId: string | null): CharacterSessionState {
  if (index < 0 || index > 8) return state
  const skillBar = [...state.skillBar]
  skillBar[index] = skillId
  return { ...state, skillBar }
}
