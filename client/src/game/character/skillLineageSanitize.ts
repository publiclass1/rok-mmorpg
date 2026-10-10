import { jobCanUseSkillFromJob } from './jobLineage'
import { SKILLS } from './skillsConfig'

const GENERAL = new Set(['basic_attack', 'sit', 'play_dead'])

/** Drop learned skills that do not belong to this job line (e.g. Hunter skills on an Archer). */
export function sanitizeSkillsForJob(
  jobId: string,
  skills: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {
    basic_attack: Math.max(1, skills.basic_attack ?? 1),
    sit: Math.max(1, skills.sit ?? 1),
    play_dead: Math.max(1, skills.play_dead ?? 1),
  }

  for (const [skillId, level] of Object.entries(skills)) {
    if (GENERAL.has(skillId)) continue
    if (level < 1) continue
    const def = SKILLS[skillId]
    if (!def) continue
    if (!jobCanUseSkillFromJob(jobId, def.jobId, skillId)) continue
    out[skillId] = level
  }

  return out
}
