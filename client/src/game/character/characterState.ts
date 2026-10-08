import { addBaseExp, addJobExp, createInitialProgress, type PlayerProgressState } from '../combat/exp'
import { statPointsForReachingBaseLevel } from '../../content/ro/expTables'
import { equipmentBonusesFromState } from './equipmentConfig'
import { addRolledItemToSession, type RolledItem } from '../items/rolledItem'
import { getConsumableEffect } from './itemCatalog'
import {
  addItemsToSessionInventory,
  parseSessionInventory,
  removeFromSessionInventory,
  type SessionInventorySlot,
} from './sessionInventory'
import { totalSkillPointsEarned } from './skillPointBudget'
import { createEmptySkillBars, isSkillBarIndexInRange } from './skillBars'
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
  skillBars: (string | null)[][]
  sessionInventory: SessionInventorySlot[]
  rolledItems: Record<string, RolledItem>
  hp: number
  mp: number
  activeRental: { kind: 'cart' | 'peco_peco' | 'falcon'; expiresAt: number } | null
}

export const BASE_PRIMARY_STAT = 1

const DEFAULT_STATS: Record<PrimaryStat, number> = {
  str: BASE_PRIMARY_STAT,
  agi: BASE_PRIMARY_STAT,
  vit: BASE_PRIMARY_STAT,
  int: BASE_PRIMARY_STAT,
  dex: BASE_PRIMARY_STAT,
  luk: BASE_PRIMARY_STAT,
}

const PRIMARY_STATS: PrimaryStat[] = ['str', 'agi', 'vit', 'int', 'dex', 'luk']

/** Stat points spent raising one primary from base to `current` (exclusive of base). */
export function statPointsSpentRaising(current: number, base = BASE_PRIMARY_STAT): number {
  let spent = 0
  for (let v = base; v < current; v++) {
    spent += statRaiseCost(v)
  }
  return spent
}

export function hasRaisedPrimaryStats(state: CharacterSessionState): boolean {
  return PRIMARY_STATS.some((stat) => state[stat] > BASE_PRIMARY_STAT)
}

export function resetAllocatedPrimaryStats(state: CharacterSessionState): CharacterSessionState {
  if (!hasRaisedPrimaryStats(state)) return state
  let refund = 0
  for (const stat of PRIMARY_STATS) {
    refund += statPointsSpentRaising(state[stat])
  }
  return {
    ...state,
    ...DEFAULT_STATS,
    statPointsUnspent: state.statPointsUnspent + refund,
  }
}

const FREE_SKILL_LEVELS: Record<string, number> = { basic_attack: 1, sit: 1, play_dead: 1 }

/** Skill points spent on leveled skills (basic_attack / sit start at 1 for free). */
export function skillPointsSpentOnSkills(skills: Record<string, number>): number {
  let spent = 0
  for (const [skillId, level] of Object.entries(skills)) {
    const baseline = FREE_SKILL_LEVELS[skillId] ?? 0
    spent += Math.max(0, level - baseline)
  }
  return spent
}

/** Match server validateProgress unspent pools before writing character_progress. */
export function reconcileProgressBudgetForSave(state: CharacterSessionState): CharacterSessionState {
  let earnedStat = 0
  for (let lv = 2; lv <= state.progress.baseLevel; lv++) {
    earnedStat += statPointsForReachingBaseLevel(lv)
  }
  let spentStat = 0
  for (const stat of PRIMARY_STATS) {
    spentStat += statPointsSpentRaising(state[stat])
  }
  const earnedSkill = totalSkillPointsEarned(state.jobId, state.progress.jobLevel)
  let spentSkill = 0
  for (const [skillId, level] of Object.entries(state.skills)) {
    spentSkill += level - (FREE_SKILL_LEVELS[skillId] ?? 0)
  }
  return {
    ...state,
    statPointsUnspent: earnedStat - spentStat,
    skillPointsUnspent: earnedSkill - spentSkill,
  }
}

export function hasAllocatedSkillPoints(skills: Record<string, number>): boolean {
  return skillPointsSpentOnSkills(skills) > 0
}

export function resetAllocatedSkills(state: CharacterSessionState): CharacterSessionState {
  if (!hasAllocatedSkillPoints(state.skills)) return state
  const refund = skillPointsSpentOnSkills(state.skills)
  const skills: Record<string, number> = {}
  for (const skillId of Object.keys(FREE_SKILL_LEVELS)) {
    skills[skillId] = FREE_SKILL_LEVELS[skillId]
  }
  const skillBars = state.skillBars.map((row) =>
    row.map((skillId) =>
      skillId === 'basic_attack' || skillId === 'sit' || skillId === 'play_dead' ? skillId : null,
    ),
  )
  return {
    ...state,
    skills,
    skillPointsUnspent: state.skillPointsUnspent + refund,
    skillBars,
  }
}

export function createInitialCharacterState(): CharacterSessionState {
  return {
    progress: createInitialProgress(),
    ...DEFAULT_STATS,
    statPointsUnspent: 0,
    jobId: 'novice',
    skillPointsUnspent: 0,
    skills: { basic_attack: 1, sit: 1, play_dead: 1 },
    equipment: createDefaultEquipment(),
    skillBars: createEmptySkillBars(),
    rolledItems: {},
    activeRental: null,
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

/** On base level up, restore HP/SP to full (job level alone does not change max). */
export function applyVitalGainAfterProgress(
  state: CharacterSessionState,
  before: { baseLevel: number; jobId: string },
): CharacterSessionState {
  if (state.progress.baseLevel <= before.baseLevel) return state
  const bonuses = equipmentBonusesFromState(state.equipment)
  const vit = state.vit + bonuses.vit
  const int = state.int + bonuses.int
  const newHpMax = derivedMaxHp(state.jobId, state.progress.baseLevel, vit)
  const newMpMax = derivedMaxMp(state.jobId, state.progress.baseLevel, int)
  return {
    ...state,
    hp: newHpMax,
    mp: newMpMax,
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
  next = applyVitalGainAfterProgress(next, { baseLevel: beforeBase, jobId: next.jobId })
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

export function consumeConsumableFromSession(
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

export function grantRolledGear(
  state: CharacterSessionState,
  rolled: RolledItem,
): CharacterSessionState {
  return {
    ...state,
    rolledItems: addRolledItemToSession(state.rolledItems, rolled),
    sessionInventory: addItemsToSessionInventory(state.sessionInventory, [rolled.id]),
  }
}

export function grantAndEquipRolledGear(
  state: CharacterSessionState,
  rolled: RolledItem,
  slot: EquipSlot,
): CharacterSessionState {
  return {
    ...state,
    rolledItems: addRolledItemToSession(state.rolledItems, rolled),
    equipment: { ...state.equipment, [slot]: rolled.id },
  }
}

const ALL_EQUIP_SLOTS = Object.keys(createDefaultEquipment()) as EquipSlot[]

export function stashAllEquipment(state: CharacterSessionState): CharacterSessionState {
  let sessionInventory = state.sessionInventory
  const equipment = createDefaultEquipment()
  for (const slot of ALL_EQUIP_SLOTS) {
    const itemId = state.equipment[slot]
    if (itemId) {
      sessionInventory = addItemsToSessionInventory(sessionInventory, [itemId])
    }
  }
  return { ...state, equipment, sessionInventory }
}

export function assignSkillBarSlot(
  state: CharacterSessionState,
  bar: number,
  slot: number,
  skillId: string | null,
): CharacterSessionState {
  if (!isSkillBarIndexInRange(bar, slot)) return state
  const skillBars = state.skillBars.map((row, rowIndex) =>
    rowIndex === bar ? [...row] : row,
  )
  skillBars[bar][slot] = skillId
  return { ...state, skillBars }
}

/** Move or swap skills between bar slots (legacy swap). */
export function moveSkillBarSlot(
  state: CharacterSessionState,
  fromBar: number,
  fromSlot: number,
  toBar: number,
  toSlot: number,
): CharacterSessionState {
  if (
    (fromBar === toBar && fromSlot === toSlot) ||
    !isSkillBarIndexInRange(fromBar, fromSlot) ||
    !isSkillBarIndexInRange(toBar, toSlot)
  ) {
    return state
  }
  const skillBars = state.skillBars.map((row) => [...row])
  const tmp = skillBars[fromBar][fromSlot]
  skillBars[fromBar][fromSlot] = skillBars[toBar][toSlot]
  skillBars[toBar][toSlot] = tmp
  return { ...state, skillBars }
}

/** Move a bar skill to another slot; target’s previous skill is discarded. */
export function relocateSkillOnBar(
  state: CharacterSessionState,
  fromBar: number,
  fromSlot: number,
  toBar: number,
  toSlot: number,
): CharacterSessionState {
  if (
    (fromBar === toBar && fromSlot === toSlot) ||
    !isSkillBarIndexInRange(fromBar, fromSlot) ||
    !isSkillBarIndexInRange(toBar, toSlot)
  ) {
    return state
  }
  const skillId = state.skillBars[fromBar][fromSlot]
  if (!skillId) return state
  const skillBars = state.skillBars.map((row) => [...row])
  skillBars[toBar][toSlot] = skillId
  skillBars[fromBar][fromSlot] = null
  return { ...state, skillBars }
}

/** Place skill on a bar slot (duplicates allowed across slots). */
export function placeSkillOnBar(
  state: CharacterSessionState,
  bar: number,
  slot: number,
  skillId: string,
): CharacterSessionState {
  return assignSkillBarSlot(state, bar, slot, skillId)
}
