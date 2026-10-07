import type { PlayerProgressState } from '../combat/exp'
import {
  addExperience,
  applyVitalGainAfterProgress,
  grantBaseLevelRewards,
  grantJobLevelRewards,
  type CharacterSessionState,
} from './characterState'
import { syncDerivedVitals } from './characterSheet'

export function applyProgressAfterExp(
  state: CharacterSessionState,
  baseExp: number,
  jobExp: number,
): { state: CharacterSessionState; baseLeveled: number; jobLeveled: number } {
  const result = addExperience(state, baseExp, jobExp)
  return {
    ...result,
    state: syncDerivedVitals(result.state),
  }
}

export function applyServerProgressUpdate(
  state: CharacterSessionState,
  progress: PlayerProgressState,
): { state: CharacterSessionState; baseGained: number; jobGained: number } {
  const beforeBase = state.progress.baseLevel
  const beforeJob = state.progress.jobLevel
  let next: CharacterSessionState = { ...state, progress }
  const baseGained = progress.baseLevel - beforeBase
  const jobGained = progress.jobLevel - beforeJob
  next = grantBaseLevelRewards(next, baseGained, beforeBase)
  next = grantJobLevelRewards(next, jobGained)
  next = applyVitalGainAfterProgress(next, { baseLevel: beforeBase, jobId: state.jobId })
  next = syncDerivedVitals(next)
  return { state: next, baseGained, jobGained }
}
