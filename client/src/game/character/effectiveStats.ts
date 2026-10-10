import type { CharacterSessionState } from './characterState'
import { equipmentBonusesFromState } from './equipmentConfig'
import { applyBonuses } from './statFormulas'
import { jobLevelStatBonus } from './jobBonuses'
import { skillPassiveDexBonus } from '../combat/skillPassives'

export function effectiveStats(state: CharacterSessionState) {
  const equipment = equipmentBonusesFromState(state.equipment)
  const owlDex = skillPassiveDexBonus(state.skills)
  const jobBonus = jobLevelStatBonus(state.jobId, state.progress.jobLevel)
  const base = {
    str: state.str,
    agi: state.agi,
    vit: state.vit,
    int: state.int,
    dex: state.dex + owlDex,
    luk: state.luk,
  }
  const withJob = applyBonuses(base, jobBonus)
  return applyBonuses(withJob, equipment)
}
