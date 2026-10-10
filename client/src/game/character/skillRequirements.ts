import { calcPreRenewalCastTimeMs } from '../combat/castTime'
import type { CharacterSheetPayload } from '../events'
import { isSkillSpendingTab } from './skillPointBudget'
import {
  canLearnSkill,
  JOB_NAMES,
  meetsSkillPrerequisites,
  SKILLS,
  type SkillDefinition,
} from './skillsConfig'

export type SkillRequirementRow = {
  label: string
  met: boolean | null
}

export type SkillDetailView = {
  description: string
  levelLine: string
  statsLines: string[]
  requirements: SkillRequirementRow[]
  blockers: string[]
}

export function skillRequirementDetail(
  skill: SkillDefinition,
  sheet: CharacterSheetPayload,
  tabJobId: string,
): SkillDetailView {
  const level = sheet.skills[skill.id] ?? 0
  const statsLines: string[] = []
  statsLines.push(`${JOB_NAMES[skill.jobId] ?? skill.jobId} skill`)
  statsLines.push(skill.type === 'passive' ? 'Passive' : 'Active')
  if (skill.type === 'active' && skill.mpCost > 0) statsLines.push(`SP ${skill.mpCost}`)
  if (skill.castTimeMs > 0) {
    const effectiveMs = calcPreRenewalCastTimeMs(skill.castTimeMs, sheet.effectiveDex)
    const effectiveSec = effectiveMs / 1000
    const baseSec = skill.castTimeMs / 1000
    if (effectiveMs < skill.castTimeMs) {
      statsLines.push(`Cast ${effectiveSec.toFixed(1)}s (${baseSec.toFixed(1)}s base, DEX)`)
    } else {
      statsLines.push(`Cast ${baseSec.toFixed(1)}s`)
    }
  }
  if (skill.type === 'active' && skill.range > 0) {
    const tiles = skill.range / 32
    statsLines.push(
      tiles === Math.floor(tiles) ? `Range ${tiles} cells` : `Range ${skill.range}px`,
    )
  }

  const jobName = JOB_NAMES[skill.jobId] ?? skill.jobId
  const jobLevelMet = isSkillSpendingTab(sheet.jobId, tabJobId)
    ? sheet.jobLevel >= skill.requiredJobLevel
    : null
  const requirements: SkillRequirementRow[] = [
    {
      label: `Requires ${jobName} Job Lv ${skill.requiredJobLevel}`,
      met: jobLevelMet,
    },
  ]

  for (const pre of skill.prerequisites) {
    const preDef = SKILLS[pre.skillId]
    const preName = preDef?.name ?? pre.skillId
    const preJob = preDef ? (JOB_NAMES[preDef.jobId] ?? preDef.jobId) : null
    const crossJob =
      preDef && preDef.jobId !== skill.jobId ? ` (${preJob} tree)` : ''
    const have = sheet.skills[pre.skillId] ?? 0
    requirements.push({
      label: `${preName} Lv ${pre.level}${crossJob}`,
      met: have >= pre.level,
    })
  }

  const blockers: string[] = []
  if (isSkillSpendingTab(sheet.jobId, tabJobId) && tabJobId === skill.jobId) {
    if (level >= skill.maxLevel) blockers.push('Already at max level.')
    else if (sheet.skillPointsUnspent < 1) blockers.push('No skill points available.')
    else if (sheet.jobLevel < skill.requiredJobLevel) {
      blockers.push(`Need Job Lv ${skill.requiredJobLevel}.`)
    } else if (!meetsSkillPrerequisites(skill, sheet.skills)) {
      blockers.push('Prerequisites not met.')
    }
  }

  return {
    description: skill.description,
    levelLine: `Level ${level} / ${skill.maxLevel}`,
    statsLines,
    requirements,
    blockers,
  }
}

export function learnableSkillIdsForTab(
  skills: SkillDefinition[],
  sheet: CharacterSheetPayload,
  tabJobId: string,
): Set<string> {
  const out = new Set<string>()
  if (!isSkillSpendingTab(sheet.jobId, tabJobId)) return out
  for (const skill of skills) {
    if (skill.jobId !== tabJobId) continue
    const level = sheet.skills[skill.id] ?? 0
    if (
      canLearnSkill(
        skill,
        sheet.jobId,
        sheet.jobLevel,
        level,
        sheet.skillPointsUnspent,
        sheet.skills,
      )
    ) {
      out.add(skill.id)
    }
  }
  return out
}

/** Prerequisite chain for learnable skills on this tab (stays within tab job skills). */
export function pathSkillIdsForGuidance(
  learnableIds: Set<string>,
  tabSkillIds: Set<string>,
): Set<string> {
  const path = new Set<string>()
  const visit = (skillId: string) => {
    if (!tabSkillIds.has(skillId)) return
    if (path.has(skillId)) return
    path.add(skillId)
    const def = SKILLS[skillId]
    if (!def) return
    for (const pre of def.prerequisites) {
      visit(pre.skillId)
    }
  }
  for (const id of learnableIds) {
    visit(id)
  }
  return path
}
