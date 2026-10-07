import { loadRoContent } from '../../content/ro/loadContent'

/** Job id chain from current job up through parents (includes `jobId`). */
export function jobAncestorIds(jobId: string): string[] {
  const jobs = loadRoContent().jobs
  const byId = new Map(jobs.map((j) => [j.id, j]))
  const out: string[] = []
  let cur: string | null = jobId
  while (cur) {
    out.push(cur)
    cur = byId.get(cur)?.parentJobId ?? null
  }
  return out
}

/** True when changing into a 2nd (or higher) job class (e.g. knight → swordman → novice). */
export function isAdvancedJobChange(targetJobId: string): boolean {
  return jobAncestorIds(targetJobId).length >= 3
}

export function jobCanUseSkillFromJob(currentJobId: string, skillJobId: string): boolean {
  if (skillJobId === 'novice') return currentJobId === 'novice'
  return jobAncestorIds(currentJobId).includes(skillJobId)
}
