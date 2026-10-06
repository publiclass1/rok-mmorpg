import { addBaseExp, addJobExp, createInitialProgress, type PlayerProgressState } from '../combat/exp'
import { SKILL_POINTS_PER_JOB_LEVEL, STAT_POINTS_PER_BASE_LEVEL, statRaiseCost } from './statFormulas'

export type PrimaryStat = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk'

export type EquipSlot = 'weapon' | 'head' | 'armor' | 'garment' | 'boots'

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
    equipment: { weapon: null, head: null, armor: null, garment: null, boots: null },
    skillBar: ['basic_attack', null, null, null, null, null, null, null, null],
    sessionInventory: ['knife', 'cotton_shirt', 'cap'],
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

export function assignSkillBarSlot(state: CharacterSessionState, index: number, skillId: string | null): CharacterSessionState {
  if (index < 0 || index > 8) return state
  const skillBar = [...state.skillBar]
  skillBar[index] = skillId
  return { ...state, skillBar }
}
