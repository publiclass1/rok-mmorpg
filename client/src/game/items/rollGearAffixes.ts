import { loadRoContent } from '../../content/ro/loadContent'
import type { GearRarityId, RoItem, WeaponClass } from '../../content/ro/types'
import type { PrimaryStat } from '../character/characterState'
import type { RolledDamageEffectKind, RolledGearAffix, RolledItemEffect } from './rolledItem'

export type CombatAffixKind =
  | 'def'
  | 'mdef'
  | 'critRate'
  | 'critResist'
  | 'hpPercent'
  | 'spPercent'
  | 'aspd'

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

const OPTION3_MYTHIC_PROC = 0.25
const OPTION3_LEVEL = 1 as const
const OPTION3_PERCENT = 2.5

const DEFAULT_AFFIX_CAP_PERCENT: Record<GearRarityId, number> = {
  common: 20,
  uncommon: 25,
  rare: 30,
  epic: 35,
  legendary: 40,
  mythic: 45,
  artifact: 50,
}

type JobRollProfile = {
  primaryWeights: Partial<Record<PrimaryStat, number>>
  combatWeights: Partial<Record<CombatAffixKind, number>>
  specialKindWeights: Partial<Record<RolledDamageEffectKind | 'critDamage', number>>
}

export function affixCapPercentForRarity(rarity: GearRarityId): number {
  const row = loadRoContent().dungeons.gear.rarities[rarity]
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
  const jobs = loadRoContent().jobs
  for (;;) {
    const job = jobs.find((j) => j.id === id)
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
        combatWeights: { def: 3, critResist: 2 },
        specialKindWeights: { melee: 4 },
      }
    case 'mage':
      return {
        primaryWeights: { int: 4 },
        combatWeights: { mdef: 3, spPercent: 2 },
        specialKindWeights: { magic: 4 },
      }
    case 'archer':
      return {
        primaryWeights: { dex: 3, agi: 2 },
        combatWeights: { critRate: 3, aspd: 2 },
        specialKindWeights: { range: 4 },
      }
    case 'acolyte':
      return {
        primaryWeights: { int: 2, vit: 2 },
        combatWeights: { hpPercent: 3, mdef: 2 },
        specialKindWeights: { magic: 4 },
      }
    case 'merchant':
      return {
        primaryWeights: { str: 2, vit: 2 },
        combatWeights: { def: 3, hpPercent: 2 },
        specialKindWeights: { melee: 4 },
      }
    case 'thief':
      return {
        primaryWeights: { agi: 3, luk: 2 },
        combatWeights: { critRate: 3, aspd: 2 },
        specialKindWeights: { melee: 2, critDamage: 3 },
      }
    default:
      return {
        primaryWeights: {},
        combatWeights: {},
        specialKindWeights: { melee: 1, range: 1, magic: 1, critDamage: 1 },
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

function weaponSpecialKind(weaponClass: WeaponClass | undefined): RolledDamageEffectKind {
  if (weaponClass === 'bow') return 'range'
  if (weaponClass === 'staff') return 'magic'
  return 'melee'
}

function shouldRollOption3(rarity: GearRarityId, rng: () => number): boolean {
  if (rarity === 'artifact') return true
  if (rarity === 'mythic') return rng() < OPTION3_MYTHIC_PROC
  return false
}

function rollOption3Effect(jobId: string, baseItem: RoItem, rng: () => number): RolledItemEffect {
  const profile = jobRollProfile(jobId)
  let kind: RolledDamageEffectKind | 'critDamage'
  if (baseItem.type === 'weapon' && baseItem.weaponClass) {
    kind = weaponSpecialKind(baseItem.weaponClass)
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
  if (kind === 'critDamage') {
    return { kind: 'critDamage', level: OPTION3_LEVEL, percent: OPTION3_PERCENT }
  }
  return { kind, level: OPTION3_LEVEL, percent: OPTION3_PERCENT }
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
): RolledGearRollResult {
  const affixes: RolledGearAffix[] = [rollPrimaryAffix(rarity, jobId, rng), rollCombatAffix(rarity, jobId, rng)]
  const effect = shouldRollOption3(rarity, rng) ? rollOption3Effect(jobId, baseItem, rng) : null
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

export const GEAR_ASPD_DISPLAY_CAP = 193

const COMBAT_AFFIX_LABELS: Record<CombatAffixKind, string> = {
  def: 'DEF',
  mdef: 'M.DEF',
  critRate: 'CRIT Rate',
  critResist: 'CRIT Resist',
  hpPercent: 'Max HP',
  spPercent: 'Max SP',
  aspd: 'ASPD',
}

export function rolledGearAffixToRow(affix: RolledGearAffix): { label: string; value: string } {
  if (affix.pool === 'primary') {
    return { label: affix.stat.toUpperCase(), value: `+${affix.value}` }
  }
  const label = COMBAT_AFFIX_LABELS[affix.kind]
  if (affix.kind === 'critRate' || affix.kind === 'hpPercent' || affix.kind === 'spPercent') {
    return { label, value: `+${affix.value}%` }
  }
  return { label, value: `+${affix.value}` }
}

export function formatRolledGearAffixLine(affix: RolledGearAffix): string {
  const { label, value } = rolledGearAffixToRow(affix)
  return `${label} ${value}`
}

export function rolledSpecialEffectToRow(effect: {
  kind: string
  level?: number
  percent: number
}): { label: string; value: string } {
  if (effect.kind === 'critDamage') {
    return {
      label: 'Critical damage',
      value: `+${effect.percent}% (Lv ${effect.level ?? 1})`,
    }
  }
  const kindLabel =
    effect.kind === 'melee' ? 'Melee damage' : effect.kind === 'range' ? 'Ranged damage' : 'Magic damage'
  return { label: kindLabel, value: `+${effect.percent}% (Lv ${effect.level ?? 1})` }
}

export function formatRolledSpecialEffectLine(effect: {
  kind: string
  level?: number
  percent: number
}): string {
  const { label, value } = rolledSpecialEffectToRow(effect)
  return `${label} ${value}`
}
