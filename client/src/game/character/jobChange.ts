import { loadRoContent } from '../../content/ro/loadContent'
import { progressFromLevels } from '../combat/exp'
import { SKILLS } from './skillsConfig'
import type { CharacterSessionState } from './characterState'

export type JobChangeOffer = {
  jobId: string
  fromJobId?: string
  requiredJobLevel: number
  requiredBaseLevel?: number
  zenyCost?: number
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

function sanitizeSkillBar(state: CharacterSessionState): (string | null)[] {
  return state.skillBar.map((skillId) => {
    if (!skillId) return null
    if (skillId === 'basic_attack' || skillId === 'sit') return skillId
    const def = SKILLS[skillId]
    if (!def || def.jobId !== state.jobId) return null
    if ((state.skills[skillId] ?? 0) < 1) return null
    return skillId
  })
}

/** Novice → 1st job: reset job progress, strip old job skills, keep base stats and unspent skill points. */
export function applyJobChange(state: CharacterSessionState, targetJobId: string): CharacterSessionState {
  const next: CharacterSessionState = {
    ...state,
    jobId: targetJobId,
    progress: progressFromLevels(
      state.progress.baseLevel,
      state.progress.baseExp,
      1,
      0,
      targetJobId,
    ),
    skills: { basic_attack: 1, sit: 1 },
    skillBar: sanitizeSkillBar({
      ...state,
      jobId: targetJobId,
      skills: { basic_attack: 1, sit: 1 },
    }),
  }
  return next
}
