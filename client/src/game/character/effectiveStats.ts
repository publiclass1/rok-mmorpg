import type { CharacterSessionState } from './characterState'
import { equipmentBonusesFromState } from './equipmentConfig'
import { applyBonuses } from './statFormulas'

export function effectiveStats(state: CharacterSessionState) {
  const bonuses = equipmentBonusesFromState(state.equipment)
  return applyBonuses(
    { str: state.str, agi: state.agi, vit: state.vit, int: state.int, dex: state.dex, luk: state.luk },
    bonuses,
  )
}
