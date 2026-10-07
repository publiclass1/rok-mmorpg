export type LevelUpKind = 'base' | 'job'

export type LevelUpStep = {
  kind: LevelUpKind
  level: number
}

/** Base levels first, then job — one step per level gained. */
export function buildLevelUpSteps(
  baseGained: number,
  jobGained: number,
  beforeBase: number,
  beforeJob: number,
): LevelUpStep[] {
  const steps: LevelUpStep[] = []
  for (let i = 1; i <= baseGained; i++) {
    steps.push({ kind: 'base', level: beforeBase + i })
  }
  for (let i = 1; i <= jobGained; i++) {
    steps.push({ kind: 'job', level: beforeJob + i })
  }
  return steps
}
