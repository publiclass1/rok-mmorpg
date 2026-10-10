import type { CharacterSessionState } from './characterState'
import { equipmentBonusesFromState } from './equipmentConfig'
import { applyBonuses } from './statFormulas'
import { skillPassiveDexBonus } from '../combat/skillPassives'

export function effectiveStats(state: CharacterSessionState) {
  const bonuses = equipmentBonusesFromState(state.equipment)
  const owlDex = skillPassiveDexBonus(state.skills)
  const base = {
    str: state.str,
    agi: state.agi,
    vit: state.vit,
    int: state.int,
    dex: state.dex + owlDex,
    luk: state.luk,
  }
  return applyBonuses(base, bonuses)
}
