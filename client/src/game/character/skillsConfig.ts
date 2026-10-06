export type SkillDefinition = {
  id: string
  name: string
  jobId: string
  maxLevel: number
  requiredJobLevel: number
  description: string
  mpCost: number
}

export const SKILLS: Record<string, SkillDefinition> = {
  basic_attack: {
    id: 'basic_attack',
    name: 'Basic Attack',
    jobId: 'novice',
    maxLevel: 1,
    requiredJobLevel: 1,
    description: 'Melee strike toward facing direction.',
    mpCost: 0,
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    jobId: 'novice',
    maxLevel: 5,
    requiredJobLevel: 5,
    description: 'Powerful blow (placeholder).',
    mpCost: 8,
  },
  magnum: {
    id: 'magnum',
    name: 'Magnum Break',
    jobId: 'novice',
    maxLevel: 3,
    requiredJobLevel: 8,
    description: 'Fire splash (placeholder).',
    mpCost: 15,
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    jobId: 'novice',
    maxLevel: 5,
    requiredJobLevel: 3,
    description: 'Restore HP (placeholder).',
    mpCost: 12,
  },
}

export const JOB_NAMES: Record<string, string> = {
  novice: 'Novice',
}

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
