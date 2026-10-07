import { loadRoContent } from '../../content/ro/loadContent'
import { jobAncestorIds, jobCanUseSkillFromJob } from './jobLineage'
import type { RoSkillMagic, RoSkillSelfBuff, SkillPrerequisite } from '../../content/ro/types'

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
  magic?: RoSkillMagic
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
      magic: s.magic,
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
export const GENERAL_ACTION_SKILL_IDS = ['basic_attack', 'sit', 'play_dead'] as const

export function generalActionSkills(): SkillDefinition[] {
  return GENERAL_ACTION_SKILL_IDS.map((id) => SKILLS[id]).filter(
    (s): s is SkillDefinition => s != null,
  )
}

export const SKILL_WINDOW_GENERAL_TAB_ID = 'general'

export type SkillWindowTabEntry = { id: string; label: string }

export function skillWindowTabs(jobId: string): string[] {
  const tabs = jobAncestorIds(jobId)
    .filter((id) => id !== 'novice')
    .filter((id) => skillsForJob(id).length > 0)
    .reverse()
  if (tabs.length > 0) return tabs
  if (skillsForJob(jobId).length > 0) return [jobId]
  return [jobId]
}

export function skillWindowTabEntries(jobId: string): SkillWindowTabEntry[] {
  const jobTabs = skillWindowTabs(jobId).map((id) => ({
    id,
    label: JOB_NAMES[id] ?? id,
  }))
  return [{ id: SKILL_WINDOW_GENERAL_TAB_ID, label: 'General' }, ...jobTabs]
}

export function skillUsableByJob(skillId: string, jobId: string): boolean {
  if (skillId === 'basic_attack' || skillId === 'sit' || skillId === 'play_dead') return true
  const skill = SKILLS[skillId]
  return skill != null && jobCanUseSkillFromJob(jobId, skill.jobId, skillId)
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

const AUTO_ATTACK_EXCLUDED_SKILL_IDS = new Set<string>(['play_dead'])

export function canPlaceOnAutoAttackRotation(
  skillId: string,
  sheet: { jobId: string; skills: Record<string, number> },
): boolean {
  if (AUTO_ATTACK_EXCLUDED_SKILL_IDS.has(skillId)) return false
  if (skillId === 'basic_attack') return (sheet.skills.basic_attack ?? 1) >= 1
  if (!canPlaceSkillOnBar(skillId, sheet.jobId, sheet.skills)) return false
  const def = SKILLS[skillId]
  if (!def) return false
  if (def.target === 'ground') return false
  return true
}

export function autoAttackAssignableSkills(sheet: {
  jobId: string
  skills: Record<string, number>
}): SkillDefinition[] {
  return barAssignableSkills(sheet)
    .filter((def) => canPlaceOnAutoAttackRotation(def.id, sheet))
    .sort((a, b) => {
      const jobCmp = (JOB_NAMES[a.jobId] ?? a.jobId).localeCompare(JOB_NAMES[b.jobId] ?? b.jobId)
      if (jobCmp !== 0) return jobCmp
      return a.name.localeCompare(b.name)
    })
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

const GROUND_MAGIC_STUBS = new Set(['safety_wall', 'ice_wall', 'quagmire'])

const ENEMY_MAGIC_STUBS = new Set(['dispell'])

/** Enemy-target magic damage skills (excludes melee stubs and dispell placeholder). */
export function isPlayerMagicEnemySkill(skillId: string): boolean {
  if (ENEMY_MAGIC_STUBS.has(skillId)) return false
  const def = SKILLS[skillId]
  return def?.magic != null && def.target === 'enemy'
}

export function isPlayerMagicEnemyStub(skillId: string): boolean {
  return ENEMY_MAGIC_STUBS.has(skillId)
}

export function isPlayerGroundMagicStub(skillId: string): boolean {
  return GROUND_MAGIC_STUBS.has(skillId)
}

/** Ground-target magic (AoE damage or utility stub). */
export function isPlayerGroundMagicSkill(skillId: string): boolean {
  if (GROUND_MAGIC_STUBS.has(skillId)) return true
  const def = SKILLS[skillId]
  return def?.target === 'ground' && def.magic?.aoeRadius != null && def.magic.aoeRadius > 0
}

export function canLearnSkill(
  skill: SkillDefinition,
  jobId: string,
  jobLevel: number,
  currentLevel: number,
  skillPoints: number,
  skills: Record<string, number>,
): boolean {
  if (!jobCanUseSkillFromJob(jobId, skill.jobId, skill.id)) return false
  if (currentLevel >= skill.maxLevel) return false
  if (jobLevel < skill.requiredJobLevel) return false
  if (skillPoints < 1) return false
  if (!meetsSkillPrerequisites(skill, skills)) return false
  return true
}
