import { loadRoContent } from '../../content/ro/loadContent'
import type { RoRentalDurationTier, RoRentalDurationTierId, RoRentalKind } from '../../content/ro/types'
import type { CharacterSessionState } from './characterState'
import { jobAncestorIds } from './jobLineage'
import { JOB_NAMES, SKILLS } from './skillsConfig'

const MS_PER_DAY = 86_400_000

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

export function rentalDurationTiers(): RoRentalDurationTier[] {
  return loadRoContent().rentals.durationTiers
}

export function rentalZenyPerDay(): number {
  return loadRoContent().rentals.zenyPerDay
}

export function rentalTierById(tierId: string): RoRentalDurationTier | undefined {
  return rentalDurationTiers().find((t) => t.id === tierId)
}

export function rentalTierZenyCost(tier: RoRentalDurationTier): number {
  return rentalZenyPerDay() * tier.days
}

export function rentalTierDurationMs(tier: RoRentalDurationTier): number {
  return tier.days * MS_PER_DAY
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
  tierId: RoRentalDurationTierId,
  zeny: number,
  now = Date.now(),
): { ok: true } | { ok: false; reason: string } {
  const entry = rentalCatalogEntry(kind)
  if (!entry) return { ok: false, reason: 'Unknown rental.' }

  const tier = rentalTierById(tierId)
  if (!tier) return { ok: false, reason: 'Unknown rental duration.' }

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

  const cost = rentalTierZenyCost(tier)
  if (zeny < cost) {
    return { ok: false, reason: `Need ${cost} zeny.` }
  }

  return { ok: true }
}

export function applyRental(
  state: CharacterSessionState,
  kind: RoRentalKind,
  tierId: RoRentalDurationTierId,
  now = Date.now(),
): CharacterSessionState {
  const tier = rentalTierById(tierId)
  if (!tier) return state
  const expiresAt = now + rentalTierDurationMs(tier)
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
  const perDay = rentalZenyPerDay()
  return `${jobPart}${skills} · ${perDay.toLocaleString()} zeny/day`
}
