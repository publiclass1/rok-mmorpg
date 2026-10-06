import { addBaseExp, addJobExp, createInitialProgress, type PlayerProgressState } from '../combat/exp'
import { SKILL_POINTS_PER_JOB_LEVEL, STAT_POINTS_PER_BASE_LEVEL, statRaiseCost } from './statFormulas'

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
  sessionInventory: string[]
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
    sessionInventory: [
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
    ],
    hp: 50,
    mp: 30,
  }
}

export function grantBaseLevelRewards(state: CharacterSessionState, levelsGained: number): CharacterSessionState {
  if (levelsGained <= 0) return state
  return {
    ...state,
    statPointsUnspent: state.statPointsUnspent + levelsGained * STAT_POINTS_PER_BASE_LEVEL,
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
  progress = addJobExp(progress, jobExp).newState
  let next = { ...state, progress }
  const baseLeveled = progress.baseLevel - beforeBase
  const jobLeveled = progress.jobLevel - beforeJob
  next = grantBaseLevelRewards(next, baseLeveled)
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
        sessionInventory: [...state.sessionInventory, current],
      },
    }
  }

  const inv = [...state.sessionInventory]
  let removeIndex: number

  if (options?.sessionInventoryIndex !== undefined) {
    const idx = options.sessionInventoryIndex
    if (idx < 0 || idx >= inv.length || inv[idx] !== itemId) {
      return { ok: false, reason: 'Item not found in inventory at that slot.' }
    }
    removeIndex = idx
  } else {
    removeIndex = inv.indexOf(itemId)
    if (removeIndex < 0) {
      return { ok: false, reason: 'Item is not in your session inventory.' }
    }
  }

  inv.splice(removeIndex, 1)
  const displaced = state.equipment[slot]
  if (displaced) inv.push(displaced)

  return {
    ok: true,
    state: {
      ...state,
      sessionInventory: inv,
      equipment: { ...state.equipment, [slot]: itemId },
    },
  }
}

export function assignSkillBarSlot(state: CharacterSessionState, index: number, skillId: string | null): CharacterSessionState {
  if (index < 0 || index > 8) return state
  const skillBar = [...state.skillBar]
  skillBar[index] = skillId
  return { ...state, skillBar }
}
