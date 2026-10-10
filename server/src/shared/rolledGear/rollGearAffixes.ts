import gearJson from '../ro/dungeonsGear.json' with { type: 'json' }
import jobsJson from '../ro/jobs.json' with { type: 'json' }
import type {
  CombatAffixKind,
  GearRarityId,
  PrimaryStat,
  RolledGearAffix,
  RolledItemEffect,
  RoItem,
} from './types.js'

export type { CombatAffixKind } from './types.js'

export type RollGearSource = 'dungeon' | 'dealer'

const GEAR_RARITIES = (
  gearJson as { rarities: Record<GearRarityId, { affixCapPercent?: number }> }
).rarities
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

const OPTION3_MYTHIC_PROC = 0.25
const SPECIAL_LEVEL_PERCENT: Record<1 | 2 | 3 | 4, number> = {
  1: 2.5,
  2: 5,
  3: 7.5,
  4: 10,
}

type Option3Kind = 'melee' | 'range' | 'magic' | 'critDamage' | 'damageReduction'
const OPTION3_KINDS: Option3Kind[] = ['melee', 'range', 'magic', 'critDamage', 'damageReduction']

const DEFAULT_AFFIX_CAP_PERCENT: Record<GearRarityId, number> = {
  common: 20,
  uncommon: 25,
  rare: 30,
  epic: 35,
  legendary: 40,
  mythic: 45,
  artifact: 50,
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
  'atk',
  'atkPercent',
  'matk',
  'matkPercent',
  'defPercent',
  'mdefPercent',
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
  atk: { min: 10, max: 200 },
  atkPercent: { min: 1, max: 35 },
  matk: { min: 10, max: 200 },
  matkPercent: { min: 1, max: 35 },
  defPercent: { min: 1, max: 35 },
  mdefPercent: { min: 1, max: 35 },
}

type JobRollProfile = {
  primaryWeights: Partial<Record<PrimaryStat, number>>
  combatWeights: Partial<Record<CombatAffixKind, number>>
}

function rarityTier(rarity: GearRarityId): number {
  const i = GEAR_RARITY_ORDER.indexOf(rarity)
  return i >= 0 ? i : 0
}

export function affixCapPercentForRarity(rarity: GearRarityId): number {
  const row = GEAR_RARITIES[rarity]
  return row?.affixCapPercent ?? DEFAULT_AFFIX_CAP_PERCENT[rarity] ?? 20
}

export function ceilingFromCapPercent(statMin: number, statMax: number, capPercent: number): number {
  return Math.max(statMin, Math.min(statMax, Math.floor((statMax * capPercent) / 100)))
}

function rollIntInclusive(min: number, max: number, rng: () => number): number {
  if (max <= min) return min
  return min + Math.floor(rng() * (max - min + 1))
}

function rollCappedStatValue(
  statMin: number,
  statMax: number,
  rarity: GearRarityId,
  rng: () => number,
): number {
  const cap = affixCapPercentForRarity(rarity)
  const ceiling = ceilingFromCapPercent(statMin, statMax, cap)
  return rollIntInclusive(statMin, ceiling, rng)
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
        primaryWeights: { str: 3, vit: 2 },
        combatWeights: { def: 3, critResist: 2, defPercent: 2 },
      }
    case 'mage':
      return {
        primaryWeights: { int: 4 },
        combatWeights: { mdef: 3, spPercent: 2, matk: 2, matkPercent: 2 },
      }
    case 'archer':
      return {
        primaryWeights: { dex: 3, agi: 2 },
        combatWeights: { critRate: 3, aspd: 2, atk: 2, atkPercent: 2 },
      }
    case 'acolyte':
      return {
        primaryWeights: { int: 2, vit: 2 },
        combatWeights: { hpPercent: 3, mdef: 2, mdefPercent: 2 },
      }
    case 'merchant':
      return {
        primaryWeights: { str: 2, vit: 2 },
        combatWeights: { def: 3, hpPercent: 2, atk: 2 },
      }
    case 'thief':
      return {
        primaryWeights: { agi: 3, luk: 2 },
        combatWeights: { critRate: 3, aspd: 2, atk: 2, atkPercent: 2 },
      }
    default:
      return {
        primaryWeights: {},
        combatWeights: {},
      }
  }
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

function shouldRollOption3(rarity: GearRarityId, rng: () => number): boolean {
  if (rarity === 'artifact') return true
  if (rarity === 'mythic') return rng() < OPTION3_MYTHIC_PROC
  return false
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

function rollOption3Effect(
  rarity: GearRarityId,
  _jobId: string,
  _baseItem: RoItem,
  rng: () => number,
  source: RollGearSource,
): RolledItemEffect {
  const kind =
    pickWeighted(OPTION3_KINDS.map((k) => ({ key: k, weight: 1 })), rng) ?? 'melee'
  const level = source === 'dealer' ? 1 : rollSpecialLevel(rarity, rng)
  const percent = SPECIAL_LEVEL_PERCENT[level]
  if (kind === 'critDamage' || kind === 'damageReduction') {
    return { kind, level, percent }
  }
  return { kind, level, percent }
}

function rollPrimaryAffix(rarity: GearRarityId, jobId: string, rng: () => number): RolledGearAffix {
  const profile = jobRollProfile(jobId)
  const stat =
    pickWeighted(
      PRIMARY_STATS.map((s) => ({ key: s, weight: profile.primaryWeights[s] ?? 1 })),
      rng,
    ) ?? 'str'
  const range = AFFIX_RANGE.primary
  return {
    pool: 'primary',
    stat,
    value: rollCappedStatValue(range.min, range.max, rarity, rng),
  }
}

function rollCombatAffix(rarity: GearRarityId, jobId: string, rng: () => number): RolledGearAffix {
  const profile = jobRollProfile(jobId)
  const kind =
    pickWeighted(
      COMBAT_AFFIX_KINDS.map((k) => ({ key: k, weight: profile.combatWeights[k] ?? 1 })),
      rng,
    ) ?? 'def'
  const range = AFFIX_RANGE[kind]
  return {
    pool: 'combat',
    kind,
    value: rollCappedStatValue(range.min, range.max, rarity, rng),
  }
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
  options?: { source?: RollGearSource },
): RolledGearRollResult {
  const source = options?.source ?? 'dungeon'
  const affixes: RolledGearAffix[] = [rollPrimaryAffix(rarity, jobId, rng), rollCombatAffix(rarity, jobId, rng)]
  const effect = shouldRollOption3(rarity, rng)
    ? rollOption3Effect(rarity, jobId, baseItem, rng, source)
    : null
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
    atk: 0,
    atkPercent: 0,
    matk: 0,
    matkPercent: 0,
    defPercent: 0,
    mdefPercent: 0,
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
