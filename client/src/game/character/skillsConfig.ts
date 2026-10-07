import { loadRoContent } from '../../content/ro/loadContent'
import { jobAncestorIds, jobCanUseSkillFromJob } from './jobLineage'
import type { RoSkillSelfBuff, SkillPrerequisite } from '../../content/ro/types'

export type SkillDefinition = {
  id: string
  name: string
  jobId: string
  maxLevel: number
  requiredJobLevel: number
  description: string
  mpCost: number
  type: 'active' | 'passive'
  target: 'enemy' | 'self' | 'ally' | 'ground'
  range: number
  castTimeMs: number
  prerequisites: SkillPrerequisite[]
  iconFile?: string | null
  selfBuff?: RoSkillSelfBuff
  mobDamageMultiplier?: number
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
      target: s.target,
      range: s.range,
      castTimeMs: s.castTimeMs,
      prerequisites: s.prerequisites,
      iconFile: s.iconFile ?? null,
      selfBuff: s.selfBuff,
      mobDamageMultiplier: s.mobDamageMultiplier,
    },
  ]),
)

export function selfBuffDurationMs(selfBuff: RoSkillSelfBuff, skillLevel: number): number {
  return selfBuff.durationMsBase + (selfBuff.durationMsPerLevel ?? 0) * skillLevel
}

export const JOB_NAMES: Record<string, string> = Object.fromEntries(ro.jobs.map((j) => [j.id, j.name]))

export function skillsForJob(jobId: string): SkillDefinition[] {
  return Object.values(SKILLS).filter((s) => s.jobId === jobId)
}

/** Job ids for skills window tabs: first job → current (excludes novice). */
export function skillWindowTabs(jobId: string): string[] {
  const tabs = jobAncestorIds(jobId)
    .filter((id) => id !== 'novice')
    .filter((id) => skillsForJob(id).length > 0)
    .reverse()
  if (tabs.length > 0) return tabs
  if (skillsForJob(jobId).length > 0) return [jobId]
  return [jobId]
}

export function skillUsableByJob(skillId: string, jobId: string): boolean {
  if (skillId === 'basic_attack' || skillId === 'sit') return true
  const skill = SKILLS[skillId]
  return skill != null && jobCanUseSkillFromJob(jobId, skill.jobId)
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

/** Active enemy-target skills that reuse the Bash melee stub in WorldScene until dedicated logic exists. */
const MELEE_SKILL_STUBS = new Set([
  'bash',
  'pierce',
  'brandish_spear',
  'spear_stab',
  'spear_boomerang',
  'bowling_bash',
])

export function isMeleeSkillStub(skillId: string): boolean {
  return MELEE_SKILL_STUBS.has(skillId)
}

/** Enemy-target actives that execute after click-to-target (includes provoke). */
export function isPlayerEnemyCastSkill(skillId: string): boolean {
  return MELEE_SKILL_STUBS.has(skillId) || skillId === 'provoke'
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
