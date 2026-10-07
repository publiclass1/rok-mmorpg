import { loadRoContent } from '../../content/ro/loadContent'
import type { RoRentalKind } from '../../content/ro/types'
import type { CharacterSessionState } from './characterState'
import { jobAncestorIds } from './jobLineage'
import { JOB_NAMES, SKILLS } from './skillsConfig'

export type ActiveRental = {
  kind: RoRentalKind
  expiresAt: number
}

export function parseActiveRental(raw: unknown): ActiveRental | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { kind?: unknown; expiresAt?: unknown }
  const kind = o.kind
  if (kind !== 'cart' && kind !== 'peco_peco' && kind !== 'falcon') return null
  if (typeof o.expiresAt !== 'number' || !Number.isFinite(o.expiresAt)) return null
  return { kind, expiresAt: o.expiresAt }
}

export function rentalOffersForNpc(npcId: string): RoRentalKind[] {
  return loadRoContent().rentals.offersByNpcId[npcId] ?? []
}

export function rentalCatalogEntry(kind: RoRentalKind) {
  return loadRoContent().rentals.catalog[kind]
}

export function activeRentalAt(state: CharacterSessionState, now = Date.now()): ActiveRental | null {
  const r = state.activeRental
  if (!r) return null
  if (r.expiresAt <= now) return null
  return r
}

export function canRentOffer(
  state: CharacterSessionState,
  kind: RoRentalKind,
  zeny: number,
  now = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  const entry = rentalCatalogEntry(kind)
  if (!entry) return { ok: false, reason: 'Unknown rental.' }

  const active = activeRentalAt(state, now)
  if (active && active.kind !== kind) {
    const name = rentalCatalogEntry(active.kind)?.name ?? active.kind
    return { ok: false, reason: `Dismiss your ${name} rental first.` }
  }
  if (active?.kind === kind) {
    return { ok: false, reason: 'You already have this rental active.' }
  }

  const lineage = new Set(jobAncestorIds(state.jobId))
  const jobOk = entry.requiredJobIds.some((id) => lineage.has(id))
  if (!jobOk) {
    const names = entry.requiredJobIds.map((id) => JOB_NAMES[id] ?? id).join(', ')
    return { ok: false, reason: `Requires ${names} job.` }
  }

  for (const req of entry.requiredSkills) {
    const level = state.skills[req.skillId] ?? 0
    if (level < req.level) {
      const skillName = SKILLS[req.skillId]?.name ?? req.skillId
      return { ok: false, reason: `Need ${skillName} Lv ${req.level}.` }
    }
  }

  if (zeny < entry.zenyCost) {
    return { ok: false, reason: `Need ${entry.zenyCost} zeny.` }
  }

  return { ok: true }
}

export function applyRental(state: CharacterSessionState, kind: RoRentalKind, now = Date.now()): CharacterSessionState {
  const entry = rentalCatalogEntry(kind)
  const expiresAt = now + entry.durationMs
  return { ...state, activeRental: { kind, expiresAt } }
}

export function clearActiveRental(state: CharacterSessionState): CharacterSessionState {
  if (!state.activeRental) return state
  return { ...state, activeRental: null }
}

export function rentalSpeedMultiplier(state: CharacterSessionState, now = Date.now()): number {
  const active = activeRentalAt(state, now)
  if (!active) return 1
  return rentalCatalogEntry(active.kind).speedMultiplier
}

export function formatRentalRequirements(kind: RoRentalKind): string {
  const entry = rentalCatalogEntry(kind)
  const jobPart = entry.requiredJobIds.map((id) => JOB_NAMES[id] ?? id).join(', ')
  const skillParts = entry.requiredSkills.map((req) => {
    const name = SKILLS[req.skillId]?.name ?? req.skillId
    return `${name} Lv ${req.level}`
  })
  const skills = skillParts.length ? ` · ${skillParts.join(', ')}` : ''
  return `${jobPart}${skills} · ${entry.zenyCost} zeny`
}
