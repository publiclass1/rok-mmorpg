export type PlayerProgressState = {
  baseLevel: number
  baseExp: number
  baseExpToNext: number
  jobLevel: number
  jobExp: number
  jobExpToNext: number
}

export function createInitialProgress(): PlayerProgressState {
  return {
    baseLevel: 1,
    baseExp: 0,
    baseExpToNext: baseExpToNext(1),
    jobLevel: 1,
    jobExp: 0,
    jobExpToNext: jobExpToNext(1),
  }
}

function baseExpToNext(level: number): number {
  return 100 + (level - 1) * 40
}

function jobExpToNext(level: number): number {
  return 50 + (level - 1) * 25
}

export function addBaseExp(
  state: PlayerProgressState,
  amount: number,
): { leveledUp: boolean; newState: PlayerProgressState } {
  let { baseLevel, baseExp, baseExpToNext: toNext } = state
  baseExp += amount
  let leveledUp = false
  while (baseExp >= toNext) {
    baseExp -= toNext
    baseLevel += 1
    toNext = baseExpToNext(baseLevel)
    leveledUp = true
  }
  return {
    leveledUp,
    newState: { ...state, baseLevel, baseExp, baseExpToNext: toNext },
  }
}

export function addJobExp(
  state: PlayerProgressState,
  amount: number,
): { leveledUp: boolean; newState: PlayerProgressState } {
  let { jobLevel, jobExp, jobExpToNext: toNext } = state
  jobExp += amount
  let leveledUp = false
  while (jobExp >= toNext) {
    jobExp -= toNext
    jobLevel += 1
    toNext = jobExpToNext(jobLevel)
    leveledUp = true
  }
  return {
    leveledUp,
    newState: { ...state, jobLevel, jobExp, jobExpToNext: toNext },
  }
}
