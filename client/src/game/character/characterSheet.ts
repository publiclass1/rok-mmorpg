import type { CharacterSessionState, EquipSlot, PrimaryStat } from './characterState'
import { parseSessionInventory } from './sessionInventory'
import { buildCombatStatPreview } from './combatStatPreview'
import { previewPlayerAttack } from '../combat/damage'
import { effectiveStats } from './effectiveStats'
import { sessionMaxHp, sessionMaxMp } from './gearVitals'
import { statRaiseCost } from './statFormulas'
import type { CharacterSheetPayload } from '../events'

export { effectiveStats } from './effectiveStats'

export function syncDerivedVitals(state: CharacterSessionState): CharacterSessionState {
  const hpMax = sessionMaxHp(state)
  const mpMax = sessionMaxMp(state)
  return {
    ...state,
    hp: Math.min(state.hp, hpMax),
    mp: Math.min(state.mp, mpMax),
  }
}

export function toCharacterSheetPayload(state: CharacterSessionState): CharacterSheetPayload {
  const stats = effectiveStats(state)
  const hpMax = sessionMaxHp(state)
  const mpMax = sessionMaxMp(state)
  const attackDamage = previewPlayerAttack(state)

  return {
    hp: state.hp,
    hpMax,
    mp: state.mp,
    mpMax,
    baseLevel: state.progress.baseLevel,
    baseExp: state.progress.baseExp,
    baseExpToNext: state.progress.baseExpToNext,
    jobLevel: state.progress.jobLevel,
    jobExp: state.progress.jobExp,
    jobExpToNext: state.progress.jobExpToNext,
    str: state.str,
    agi: state.agi,
    vit: state.vit,
    int: state.int,
    dex: state.dex,
    luk: state.luk,
    effectiveStr: stats.str,
    effectiveAgi: stats.agi,
    effectiveVit: stats.vit,
    effectiveInt: stats.int,
    effectiveDex: stats.dex,
    effectiveLuk: stats.luk,
    statPointsUnspent: state.statPointsUnspent,
    statRaiseCosts: {
      str: statRaiseCost(state.str),
      agi: statRaiseCost(state.agi),
      vit: statRaiseCost(state.vit),
      int: statRaiseCost(state.int),
      dex: statRaiseCost(state.dex),
      luk: statRaiseCost(state.luk),
    },
    jobId: state.jobId,
    skillPointsUnspent: state.skillPointsUnspent,
    skills: { ...state.skills },
    equipment: { ...state.equipment },
    skillBars: state.skillBars.map((row) => [...row]),
    sessionInventory: parseSessionInventory(state.sessionInventory),
    attackDamage,
    combatStats: buildCombatStatPreview(state),
  }
}

export type CharacterAction =
  | { type: 'raiseStat'; stat: PrimaryStat }
  | { type: 'learnSkill'; skillId: string }
  | { type: 'equip'; slot: EquipSlot; itemId: string | null; sessionInventoryIndex?: number }

/** Rebuild session from Phaser-emitted sheet (combat/EXP) while keeping inventory arrays. */
export function sessionFromSheetPayload(
  sheet: CharacterSheetPayload,
  prev: CharacterSessionState,
): CharacterSessionState {
  return syncDerivedVitals({
    ...prev,
    hp: sheet.hp,
    mp: sheet.mp,
    progress: {
      baseLevel: sheet.baseLevel,
      baseExp: sheet.baseExp,
      baseExpToNext: sheet.baseExpToNext,
      jobLevel: sheet.jobLevel,
      jobExp: sheet.jobExp,
      jobExpToNext: sheet.jobExpToNext,
    },
    str: sheet.str,
    agi: sheet.agi,
    vit: sheet.vit,
    int: sheet.int,
    dex: sheet.dex,
    luk: sheet.luk,
    statPointsUnspent: sheet.statPointsUnspent,
    skillPointsUnspent: sheet.skillPointsUnspent,
    skills: { ...sheet.skills },
    equipment: { ...sheet.equipment },
    skillBars: sheet.skillBars.map((row) => [...row]),
    sessionInventory: parseSessionInventory(sheet.sessionInventory),
    jobId: sheet.jobId,
  })
}

/**
 * Merge combat/stat sheet updates from Phaser without reverting skill bar layout.
 * Bar changes go through dispatchCharacterAction (which updates session before emitting sheet).
 */
export function mergeSheetIntoSession(
  sheet: CharacterSheetPayload,
  prev: CharacterSessionState,
): CharacterSessionState {
  const merged = sessionFromSheetPayload(sheet, prev)
  return { ...merged, skillBars: prev.skillBars.map((row) => [...row]) }
}
