import gearJson from '../ro/dungeonsGear.json' with { type: 'json' }
import jobsJson from '../ro/jobs.json' with { type: 'json' }
import type {
  CombatAffixKind,
  GearRarityId,
  PrimaryStat,
  RolledDamageEffectKind,
  RolledGearAffix,
  RolledItemEffect,
  RoItem,
  WeaponClass,
} from './types.js'

export type { CombatAffixKind } from './types.js'

const GEAR_RARITIES = (gearJson as { rarities: Record<GearRarityId, { statMin: number }> }).rarities
const JOBS = (jobsJson as { jobs: Array<{ id: string; parentJobId?: string | null }> }).jobs

const GEAR_RARITY_ORDER: GearRarityId[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'artifact',
]

function rarityTier(rarity: GearRarityId): number {
  const i = GEAR_RARITY_ORDER.indexOf(rarity)
  return i >= 0 ? i : 0
}

const PRIMARY_STATS: PrimaryStat[] = ['str', 'agi', 'vit', 'int', 'dex', 'luk']

const COMBAT_AFFIX_KINDS: CombatAffixKind[] = [
  'def',
  'mdef',
  'critRate',
  'critResist',
  'hpPercent',
  'spPercent',
  'aspd',
]

const AFFIX_RANGE: Record<string, { min: number; max: number }> = {
  primary: { min: 1, max: 20 },
  def: { min: 5, max: 35 },
  mdef: { min: 5, max: 35 },
  critRate: { min: 1, max: 15 },
  critResist: { min: 5, max: 35 },
  hpPercent: { min: 5, max: 20 },
  spPercent: { min: 5, max: 20 },
  aspd: { min: 1, max: 5 },
}

const SPECIAL_PROC_CHANCE = 0.03
const SPECIAL_LEVEL_PERCENT: Record<1 | 2 | 3 | 4, number> = {
  1: 2.5,
  2: 5,
  3: 7.5,
  4: 10,
}

type JobRollProfile = {
  option1Weight: number
  primaryWeights: Partial<Record<PrimaryStat, number>>
  combatWeights: Partial<Record<CombatAffixKind, number>>
  specialKindWeights: Partial<Record<RolledDamageEffectKind | 'critDamage', number>>
}

function firstClassJobId(jobId: string): string {
  let id = jobId
  for (;;) {
    const job = JOBS.find((j) => j.id === id)
    if (!job) return 'novice'
    if (job.parentJobId === 'novice') return id
    if (!job.parentJobId) return id
    id = job.parentJobId
  }
}

function jobRollProfile(jobId: string): JobRollProfile {
  const base = firstClassJobId(jobId)
  switch (base) {
    case 'swordman':
      return {
        option1Weight: 0.55,
        primaryWeights: { str: 3, vit: 2 },
        combatWeights: { def: 3, critResist: 2 },
        specialKindWeights: { melee: 4 },
      }
    case 'mage':
      return {
        option1Weight: 0.6,
        primaryWeights: { int: 4 },
        combatWeights: { mdef: 3, spPercent: 2 },
        specialKindWeights: { magic: 4 },
      }
    case 'archer':
      return {
        option1Weight: 0.55,
        primaryWeights: { dex: 3, agi: 2 },
        combatWeights: { critRate: 3, aspd: 2 },
        specialKindWeights: { range: 4 },
      }
    case 'acolyte':
      return {
        option1Weight: 0.5,
        primaryWeights: { int: 2, vit: 2 },
        combatWeights: { hpPercent: 3, mdef: 2 },
        specialKindWeights: { magic: 4 },
      }
    case 'merchant':
      return {
        option1Weight: 0.5,
        primaryWeights: { str: 2, vit: 2 },
        combatWeights: { def: 3, hpPercent: 2 },
        specialKindWeights: { melee: 4 },
      }
    case 'thief':
      return {
        option1Weight: 0.5,
        primaryWeights: { agi: 3, luk: 2 },
        combatWeights: { critRate: 3, aspd: 2 },
        specialKindWeights: { melee: 2, critDamage: 3 },
      }
    default:
      return {
        option1Weight: 0.5,
        primaryWeights: {},
        combatWeights: {},
        specialKindWeights: { melee: 1, range: 1, magic: 1, critDamage: 1 },
      }
  }
}

function rollScaledInt(minSpec: number, maxSpec: number, rarity: GearRarityId, rng: () => number): number {
  const tier = rarityTier(rarity)
  const maxTier = GEAR_RARITY_ORDER.length - 1
  const statMin = GEAR_RARITIES[rarity].statMin
  const lo = Math.min(maxSpec, Math.max(minSpec, statMin))
  const hi = Math.min(maxSpec, minSpec + Math.floor(((maxSpec - minSpec) * tier) / maxTier))
  const ceiling = Math.max(lo, hi)
  return lo + Math.floor(rng() * (ceiling - lo + 1))
}

function pickWeighted<T extends string | number>(
  entries: Array<{ key: T; weight: number }>,
  rng: () => number,
): T | null {
  const filtered = entries.filter((e) => e.weight > 0)
  if (filtered.length === 0) return null
  const total = filtered.reduce((s, e) => s + e.weight, 0)
  let roll = rng() * total
  for (const e of filtered) {
    roll -= e.weight
    if (roll < 0) return e.key
  }
  return filtered[filtered.length - 1]?.key ?? null
}

function weaponSpecialKind(weaponClass: WeaponClass | undefined): RolledDamageEffectKind {
  if (weaponClass === 'bow') return 'range'
  if (weaponClass === 'staff') return 'magic'
  return 'melee'
}

function rollSpecialLevel(rarity: GearRarityId, rng: () => number): 1 | 2 | 3 | 4 {
  const tier = rarityTier(rarity)
  const weights: Array<{ key: 1 | 2 | 3 | 4; weight: number }> = [
    { key: 1, weight: Math.max(1, 8 - tier) },
    { key: 2, weight: Math.max(1, 6 - Math.floor(tier / 2)) },
    { key: 3, weight: Math.max(0, tier - 1) },
    { key: 4, weight: Math.max(0, tier - 3) },
  ]
  const picked = pickWeighted(weights, rng)
  return picked ?? 1
}

function rollSpecialEffect(
  rarity: GearRarityId,
  jobId: string,
  baseItem: RoItem,
  rng: () => number,
): RolledItemEffect | null {
  if (rng() >= SPECIAL_PROC_CHANCE) return null
  const profile = jobRollProfile(jobId)
  let kind: RolledDamageEffectKind | 'critDamage'
  if (baseItem.type === 'weapon' && baseItem.weaponClass) {
    const forced = weaponSpecialKind(baseItem.weaponClass)
    kind = forced
    if (profile.specialKindWeights.critDamage && rng() < 0.15) {
      kind = 'critDamage'
    }
  } else {
    kind =
      pickWeighted(
        (['melee', 'range', 'magic', 'critDamage'] as const).map((k) => ({
          key: k,
          weight: profile.specialKindWeights[k] ?? 1,
        })),
        rng,
      ) ?? 'melee'
  }
  const level = rollSpecialLevel(rarity, rng)
  const percent = SPECIAL_LEVEL_PERCENT[level]
  if (kind === 'critDamage') {
    return { kind: 'critDamage', level, percent }
  }
  return { kind, level, percent }
}

function affixKey(affix: RolledGearAffix): string {
  return affix.pool === 'primary' ? `p:${affix.stat}` : `c:${affix.kind}`
}

function rollOneRegularAffix(
  rarity: GearRarityId,
  jobId: string,
  used: Set<string>,
  rng: () => number,
): RolledGearAffix | null {
  const profile = jobRollProfile(jobId)
  const usePrimary = rng() < profile.option1Weight
  if (usePrimary) {
    const candidates = PRIMARY_STATS.filter((s) => !used.has(`p:${s}`))
    if (candidates.length === 0) return null
    const stat =
      pickWeighted(
        candidates.map((s) => ({ key: s, weight: profile.primaryWeights[s] ?? 1 })),
        rng,
      ) ?? candidates[0]
    const range = AFFIX_RANGE.primary
    return { pool: 'primary', stat, value: rollScaledInt(range.min, range.max, rarity, rng) }
  }
  const candidates = COMBAT_AFFIX_KINDS.filter((k) => !used.has(`c:${k}`))
  if (candidates.length === 0) return null
  const kind =
    pickWeighted(
      candidates.map((k) => ({ key: k, weight: profile.combatWeights[k] ?? 1 })),
      rng,
    ) ?? candidates[0]
  const range = AFFIX_RANGE[kind]
  return { pool: 'combat', kind, value: rollScaledInt(range.min, range.max, rarity, rng) }
}

export function primaryStatsFromAffixes(affixes: RolledGearAffix[]): Partial<Record<PrimaryStat, number>> {
  const out: Partial<Record<PrimaryStat, number>> = {}
  for (const a of affixes) {
    if (a.pool !== 'primary') continue
    out[a.stat] = (out[a.stat] ?? 0) + a.value
  }
  return out
}

export type RolledGearRollResult = {
  affixes: RolledGearAffix[]
  stats: Partial<Record<PrimaryStat, number>>
  effect: RolledItemEffect | null
}

export function rollGearAffixes(
  rarity: GearRarityId,
  jobId: string,
  baseItem: RoItem,
  rng: () => number,
): RolledGearRollResult {
  const affixes: RolledGearAffix[] = []
  const used = new Set<string>()
  for (let i = 0; i < 2; i++) {
    const affix = rollOneRegularAffix(rarity, jobId, used, rng)
    if (!affix) continue
    affixes.push(affix)
    used.add(affixKey(affix))
  }
  const effect = rollSpecialEffect(rarity, jobId, baseItem, rng)
  const stats = primaryStatsFromAffixes(affixes)
  return { affixes, stats, effect }
}

export type EquippedCombatAffixTotals = Record<CombatAffixKind, number>

export function emptyCombatAffixTotals(): EquippedCombatAffixTotals {
  return {
    def: 0,
    mdef: 0,
    critRate: 0,
    critResist: 0,
    hpPercent: 0,
    spPercent: 0,
    aspd: 0,
  }
}

export function combatAffixTotalsFromAffixes(affixes: RolledGearAffix[]): EquippedCombatAffixTotals {
  const totals = emptyCombatAffixTotals()
  for (const a of affixes) {
    if (a.pool !== 'combat') continue
    totals[a.kind] += a.value
  }
  return totals
}

