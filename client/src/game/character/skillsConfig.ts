import { loadRoContent } from '../../content/ro/loadContent'
import type { SkillPrerequisite } from '../../content/ro/types'

export type SkillDefinition = {
  id: string
  name: string
  jobId: string
  maxLevel: number
  requiredJobLevel: number
  description: string
  mpCost: number
  type: 'active' | 'passive'
  prerequisites: SkillPrerequisite[]
  iconFile?: string | null
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
      type: s.type,
      prerequisites: s.prerequisites,
      iconFile: s.iconFile ?? null,
    },
  ]),
)

export const JOB_NAMES: Record<string, string> = Object.fromEntries(ro.jobs.map((j) => [j.id, j.name]))

export function skillsForJob(jobId: string): SkillDefinition[] {
  return Object.values(SKILLS).filter((s) => s.jobId === jobId)
}

export function skillUsableByJob(skillId: string, jobId: string): boolean {
  if (skillId === 'basic_attack' || skillId === 'sit') return true
  const skill = SKILLS[skillId]
  return skill != null && skill.jobId === jobId
}

export function meetsSkillPrerequisites(
  skill: SkillDefinition,
  skills: Record<string, number>,
): boolean {
  for (const pre of skill.prerequisites) {
    if ((skills[pre.skillId] ?? 0) < pre.level) return false
  }
  return true
}

export function barAssignableSkills(sheet: {
  jobId: string
  skills: Record<string, number>
}): SkillDefinition[] {
  return Object.values(SKILLS)
    .filter((def) => def.type === 'active')
    .filter((def) => (sheet.skills[def.id] ?? 0) >= 1)
    .filter((def) => skillUsableByJob(def.id, sheet.jobId))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function canPlaceSkillOnBar(
  skillId: string,
  jobId: string,
  skills: Record<string, number>,
): boolean {
  if ((skills[skillId] ?? 0) < 1) return false
  if (!skillUsableByJob(skillId, jobId)) return false
  const def = SKILLS[skillId]
  return def != null && def.type === 'active'
}

export function canLearnSkill(
  skill: SkillDefinition,
  jobId: string,
  jobLevel: number,
  currentLevel: number,
  skillPoints: number,
  skills: Record<string, number>,
): boolean {
  if (skill.jobId !== jobId) return false
  if (currentLevel >= skill.maxLevel) return false
  if (jobLevel < skill.requiredJobLevel) return false
  if (skillPoints < 1) return false
  if (!meetsSkillPrerequisites(skill, skills)) return false
  return true
}
