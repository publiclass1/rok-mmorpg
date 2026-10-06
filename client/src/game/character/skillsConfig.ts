import { loadRoContent } from '../../content/ro/loadContent'

export type SkillDefinition = {
  id: string
  name: string
  jobId: string
  maxLevel: number
  requiredJobLevel: number
  description: string
  mpCost: number
}

const ro = loadRoContent()

export const SKILLS: Record<string, SkillDefinition> = Object.fromEntries(
  ro.skills.map((s) => [
    s.id,
    {
      id: s.id,
      name: s.name,
      jobId: s.jobId,
      maxLevel: s.maxLevel,
      requiredJobLevel: s.requiredJobLevel,
      description: s.description,
      mpCost: s.mpCost,
    },
  ]),
)

export const JOB_NAMES: Record<string, string> = Object.fromEntries(ro.jobs.map((j) => [j.id, j.name]))

export function skillsForJob(jobId: string): SkillDefinition[] {
  return Object.values(SKILLS).filter((s) => s.jobId === jobId)
}

export function canLearnSkill(
  skill: SkillDefinition,
  jobLevel: number,
  currentLevel: number,
  skillPoints: number,
): boolean {
  if (currentLevel >= skill.maxLevel) return false
  if (jobLevel < skill.requiredJobLevel) return false
  if (skillPoints < 1) return false
  return true
}
