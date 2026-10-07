import { loadRoContent } from '../../content/ro/loadContent'
import { jobAncestorIds } from './jobLineage'
import { SKILL_POINTS_PER_JOB_LEVEL } from './statFormulas'

/** Total skill points earned for this job line (1st job max pool + current job levels on 2nd+ classes). */
export function totalSkillPointsEarned(jobId: string, jobLevel: number): number {
  const ancestors = jobAncestorIds(jobId).filter((id) => id !== 'novice')
  let earned = Math.max(0, (jobLevel - 1) * SKILL_POINTS_PER_JOB_LEVEL)
  if (ancestors.length <= 1) return earned

  const jobs = loadRoContent().jobs
  const byId = new Map(jobs.map((j) => [j.id, j]))
  for (let i = 1; i < ancestors.length; i++) {
    const ancestorJobId = ancestors[i]
    const maxLv = byId.get(ancestorJobId)?.maxJobLevel ?? 50
    earned += Math.max(0, (maxLv - 1) * SKILL_POINTS_PER_JOB_LEVEL)
  }
  return earned
}

export function isSkillSpendingTab(currentJobId: string, tabJobId: string): boolean {
  if (tabJobId === 'novice') return false
  if (tabJobId === currentJobId) return true
  return jobAncestorIds(currentJobId).includes(tabJobId)
}
