import { baseExpRequiredForLevel, jobExpRequiredForLevel, getExpTables } from '../../content/ro/expTables'
import { loadRoContent } from '../../content/ro/loadContent'

export type PlayerProgressState = {
  baseLevel: number
  baseExp: number
  baseExpToNext: number
  jobLevel: number
  jobExp: number
  jobExpToNext: number
}

export function getBaseLevelCap(): number {
  return getExpTables().baseLevelCap
}

export function getMaxJobLevel(jobId: string): number {
  const job = loadRoContent().jobs.find((j) => j.id === jobId)
  return job?.maxJobLevel ?? getExpTables().jobLevelCap
}

export function createInitialProgress(): PlayerProgressState {
  return {
    baseLevel: 1,
    baseExp: 0,
    baseExpToNext: baseExpRequiredForLevel(1),
    jobLevel: 1,
    jobExp: 0,
    jobExpToNext: jobExpRequiredForLevel(1),
  }
}

/** Rebuild progress slice from persisted level/exp (recomputes exp-to-next thresholds). */
export function progressFromLevels(
  baseLevel: number,
  baseExp: number,
  jobLevel: number,
  jobExp: number,
  jobId = 'novice',
): PlayerProgressState {
  const capBase = getBaseLevelCap()
  const capJob = getMaxJobLevel(jobId)
  const clampedBase = Math.min(Math.max(baseLevel, 1), capBase)
  const clampedJob = Math.min(Math.max(jobLevel, 1), capJob)
  return {
    baseLevel: clampedBase,
    baseExp,
    baseExpToNext: clampedBase >= capBase ? 0 : baseExpRequiredForLevel(clampedBase),
    jobLevel: clampedJob,
    jobExp,
    jobExpToNext: clampedJob >= capJob ? 0 : jobExpRequiredForLevel(clampedJob),
  }
}

export function addBaseExp(
  state: PlayerProgressState,
  amount: number,
): { leveledUp: boolean; newState: PlayerProgressState } {
  const cap = getBaseLevelCap()
  let { baseLevel, baseExp, baseExpToNext: toNext } = state
  if (baseLevel >= cap) {
    return { leveledUp: false, newState: { ...state, baseExp: 0, baseExpToNext: 0 } }
  }
  baseExp += amount
  let leveledUp = false
  while (toNext > 0 && baseExp >= toNext && baseLevel < cap) {
    baseExp -= toNext
    baseLevel += 1
    leveledUp = true
    toNext = baseLevel >= cap ? 0 : baseExpRequiredForLevel(baseLevel)
  }
  if (baseLevel >= cap) {
    baseExp = 0
    toNext = 0
  }
  return {
    leveledUp,
    newState: { ...state, baseLevel, baseExp, baseExpToNext: toNext },
  }
}

export function addJobExp(
  state: PlayerProgressState,
  amount: number,
  jobId: string,
): { leveledUp: boolean; newState: PlayerProgressState } {
  const cap = getMaxJobLevel(jobId)
  let { jobLevel, jobExp, jobExpToNext: toNext } = state
  if (jobLevel >= cap) {
    return { leveledUp: false, newState: { ...state, jobExp: 0, jobExpToNext: 0 } }
  }
  jobExp += amount
  let leveledUp = false
  while (toNext > 0 && jobExp >= toNext && jobLevel < cap) {
    jobExp -= toNext
    jobLevel += 1
    leveledUp = true
    toNext = jobLevel >= cap ? 0 : jobExpRequiredForLevel(jobLevel)
  }
  if (jobLevel >= cap) {
    jobExp = 0
    toNext = 0
  }
  return {
    leveledUp,
    newState: { ...state, jobLevel, jobExp, jobExpToNext: toNext },
  }
}
