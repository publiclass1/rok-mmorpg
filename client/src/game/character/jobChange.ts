import { loadRoContent } from '../../content/ro/loadContent'
import { createRolledGearFromBase } from '../items/rolledItem'
import { progressFromLevels } from '../combat/exp'
import { isSkillBarConsumable } from './skillBarEntry'
import { SKILLS } from './skillsConfig'
import type { CharacterSessionState, EquipSlot } from './characterState'
import {
  grantAndEquipRolledGear,
  stashAllEquipment,
} from './characterState'
import { isAdvancedJobChange, jobCanUseSkillFromJob } from './jobLineage'

export type JobChangeOffer = {
  jobId: string
  fromJobId?: string
  requiredJobLevel: number
  requiredBaseLevel?: number
  zenyCost?: number
}

/** Content `jobMaster.json` overrides DB/TMJ config when present (canonical job paths). */
export function jobChangeOffersForNpc(npcId: string, config: unknown): JobChangeOffer[] {
  const fromContent = loadRoContent().jobMaster.offersByNpcId[npcId]
  if (fromContent?.length) {
    return fromContent.map((o) => ({
      jobId: o.jobId,
      fromJobId: o.fromJobId,
      requiredJobLevel: o.requiredJobLevel,
      requiredBaseLevel: o.requiredBaseLevel ?? 1,
      zenyCost: o.zenyCost ?? 0,
    }))
  }
  return jobChangeOffersFromNpcConfig(config)
}

export function jobChangeOffersFromNpcConfig(config: unknown): JobChangeOffer[] {
  if (!config || typeof config !== 'object') return []
  const offers = (config as { offers?: unknown }).offers
  if (!Array.isArray(offers)) return []
  const parsed: JobChangeOffer[] = []
  for (const raw of offers) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    if (typeof o.jobId !== 'string') continue
    parsed.push({
      jobId: o.jobId,
      fromJobId: typeof o.fromJobId === 'string' ? o.fromJobId : undefined,
      requiredJobLevel: typeof o.requiredJobLevel === 'number' ? o.requiredJobLevel : 1,
      requiredBaseLevel: typeof o.requiredBaseLevel === 'number' ? o.requiredBaseLevel : 1,
      zenyCost: typeof o.zenyCost === 'number' ? o.zenyCost : 0,
    })
  }
  return parsed
}

export function canAcceptJobChange(
  params: { jobId: string; jobLevel: number; baseLevel: number },
  offer: JobChangeOffer,
  zeny: number,
): { ok: true } | { ok: false; reason: string } {
  const jobs = loadRoContent().jobs
  const target = jobs.find((j) => j.id === offer.jobId)
  if (!target) return { ok: false, reason: 'Unknown job.' }

  const fromJobId = offer.fromJobId ?? target.parentJobId
  if (fromJobId && params.jobId !== fromJobId) {
    return { ok: false, reason: `Must be a ${fromJobId} to take this path.` }
  }
  if (target.parentJobId && params.jobId !== target.parentJobId) {
    return { ok: false, reason: `Must be a ${target.parentJobId} first.` }
  }
  if (params.jobLevel < offer.requiredJobLevel) {
    return { ok: false, reason: `Need Job Lv ${offer.requiredJobLevel} (currently ${params.jobLevel}).` }
  }
  const reqBase = offer.requiredBaseLevel ?? 1
  if (params.baseLevel < reqBase) {
    return { ok: false, reason: `Need Base Lv ${reqBase}.` }
  }
  const cost = offer.zenyCost ?? 0
  if (zeny < cost) return { ok: false, reason: `Need ${cost} zeny.` }
  if (params.jobId === offer.jobId) return { ok: false, reason: 'You already have this job.' }
  return { ok: true }
}

function skillsAfterJobChange(state: CharacterSessionState, targetJobId: string): Record<string, number> {
  const next: Record<string, number> = { basic_attack: 1, sit: 1, play_dead: 1 }
  if (!isAdvancedJobChange(targetJobId)) {
    return next
  }
  for (const [skillId, level] of Object.entries(state.skills)) {
    if (skillId === 'basic_attack' || skillId === 'sit' || skillId === 'play_dead') continue
    const def = SKILLS[skillId]
    if (!def || level < 1) continue
    if (jobCanUseSkillFromJob(targetJobId, def.jobId)) {
      next[skillId] = level
    }
  }
  return next
}

function sanitizeSkillBar(state: CharacterSessionState): (string | null)[] {
  return state.skillBar.map((skillId) => {
    if (!skillId) return null
    if (isSkillBarConsumable(skillId)) return skillId
    if (skillId === 'basic_attack' || skillId === 'sit' || skillId === 'play_dead') return skillId
    const def = SKILLS[skillId]
    if (!def || !jobCanUseSkillFromJob(state.jobId, def.jobId)) return null
    if ((state.skills[skillId] ?? 0) < 1) return null
    return skillId
  })
}

function applyStarterGear(state: CharacterSessionState, targetJobId: string): CharacterSessionState {
  const kit = loadRoContent().jobStarterGear.kits[targetJobId]
  if (!kit) return state
  let next = state
  const reqLevel = Math.max(1, state.progress.baseLevel)
  for (const piece of kit.pieces) {
    const rolled = createRolledGearFromBase(piece.baseItemId, {
      rarity: 'common',
      requiredBaseLevel: reqLevel,
    })
    if (!rolled) continue
    next = grantAndEquipRolledGear(next, rolled, piece.slot as EquipSlot)
  }
  return next
}

/** Job change: reset job progress; 2nd jobs keep prior class skills; grant common rolled starter kit. */
export function applyJobChange(state: CharacterSessionState, targetJobId: string): CharacterSessionState {
  const stashed = stashAllEquipment(state)
  const skills = skillsAfterJobChange(stashed, targetJobId)
  let next: CharacterSessionState = {
    ...stashed,
    jobId: targetJobId,
    progress: progressFromLevels(
      stashed.progress.baseLevel,
      stashed.progress.baseExp,
      1,
      0,
      targetJobId,
    ),
    skills,
    skillBar: sanitizeSkillBar({
      ...stashed,
      jobId: targetJobId,
      skills,
    }),
  }
  next = applyStarterGear(next, targetJobId)
  return next
}
