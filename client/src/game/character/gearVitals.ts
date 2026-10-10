import type { CharacterSessionState } from './characterState'
import { effectiveStats } from './effectiveStats'
import { derivedMaxHp, derivedMaxMp } from './statFormulas'
import { sumEquippedCombatAffixes } from '../items/rolledItemCombat'

export function sessionMaxHp(state: CharacterSessionState): number {
  const stats = effectiveStats(state)
  const base = derivedMaxHp(state.jobId, state.progress.baseLevel, stats.vit)
  const { hpPercent } = sumEquippedCombatAffixes(state.equipment)
  return Math.floor(base * (1 + hpPercent / 100))
}

export function sessionMaxMp(state: CharacterSessionState): number {
  const stats = effectiveStats(state)
  const base = derivedMaxMp(state.jobId, state.progress.baseLevel, stats.int)
  const { spPercent } = sumEquippedCombatAffixes(state.equipment)
  return Math.floor(base * (1 + spPercent / 100))
}
