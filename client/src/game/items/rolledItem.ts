import { loadRoContent } from '../../content/ro/loadContent'
import type { GearRarityId, RoDungeonFloor, RoItem } from '../../content/ro/types'
import type { PrimaryStat } from '../character/characterState'
import {
  affixCapPercentForRarity,
  ceilingFromCapPercent,
  primaryStatsFromAffixes,
  rollGearAffixes,
} from './rollGearAffixes'
import type { CombatAffixKind } from './rollGearAffixes'

export type RolledDamageEffectKind = 'melee' | 'range' | 'magic'

export type RolledEffectKind = RolledDamageEffectKind | 'critChance' | 'critDamage'

export type RolledGearAffix =
  | { pool: 'primary'; stat: PrimaryStat; value: number }
  | { pool: 'combat'; kind: CombatAffixKind; value: number }

export type RolledItemEffect =
  | { kind: RolledDamageEffectKind; level?: 1 | 2 | 3 | 4; percent: number }
  | { kind: 'critDamage'; level: 1 | 2 | 3 | 4; percent: number }
  | { kind: 'critChance'; percent: number }

export type RolledItem = {
  id: string
  baseItemId: string
  rarity: GearRarityId
  requiredBaseLevel: number
  stats: Partial<Record<PrimaryStat, number>>
  affixes: RolledGearAffix[]
  effect: RolledItemEffect | null
  slots: 2
  cards: [string | null, string | null]
}

const ROLLED_PREFIX = 'ri:'

export function isRolledItemId(itemId: string | null | undefined): boolean {
  return typeof itemId === 'string' && itemId.startsWith(ROLLED_PREFIX)
}

export function parseRolledBaseItemId(itemId: string): string | null {
  if (!isRolledItemId(itemId)) return null
  const rest = itemId.slice(ROLLED_PREFIX.length)
  const lastColon = rest.lastIndexOf(':')
  if (lastColon <= 0) return null
  return rest.slice(0, lastColon)
}

function randomId8(rng: () => number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(rng() * chars.length)]
  }
  return out
}

function pickWeightedRarity(weights: Record<GearRarityId, number>, rng: () => number): GearRarityId {
  const entries = Object.entries(weights) as Array<[GearRarityId, number]>
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let roll = rng() * total
  for (const [id, w] of entries) {
    roll -= w
    if (roll < 0) return id
  }
  return entries[entries.length - 1]?.[0] ?? 'common'
}

function rollLevelInBand(minLevel: number, maxLevel: number, rng: () => number): number {
  const raw = minLevel + Math.floor(rng() * (maxLevel - minLevel + 1))
  return Math.max(minLevel, Math.min(maxLevel, Math.floor(raw / 5) * 5 || minLevel))
}

function baseItemsForSlot(slot: string): RoItem[] {
  const { items, dungeons } = loadRoContent()
  const allowed = new Set(dungeons.gear.dropSlots)
  if (!allowed.has(slot)) return []
  return items.filter(
    (i) => i.equipSlot === slot && i.bonuses && i.layerColor && i.dungeonRollable !== false,
  )
}

function buildRolledItem(
  base: RoItem,
  rarity: GearRarityId,
  requiredBaseLevel: number,
  jobId: string,
  rng: () => number,
): RolledItem {
  const id = `${ROLLED_PREFIX}${base.id}:${randomId8(rng)}`
  const rolled = rollGearAffixes(rarity, jobId, base, rng)
  return {
    id,
    baseItemId: base.id,
    rarity,
    requiredBaseLevel,
    stats: rolled.stats,
    affixes: rolled.affixes,
    effect: rolled.effect,
    slots: 2,
    cards: [null, null],
  }
}

export type CreateRolledGearOptions = {
  rarity: GearRarityId
  requiredBaseLevel: number
  jobId?: string
}

export function createRolledGearFromBase(
  baseItemId: string,
  options: CreateRolledGearOptions,
  rng = Math.random,
): RolledItem | null {
  const base = loadRoContent().items.find((i) => i.id === baseItemId)
  if (!base?.equipSlot || !base.bonuses || !base.layerColor) return null
  const jobId = options.jobId ?? 'novice'
  return buildRolledItem(base, options.rarity, options.requiredBaseLevel, jobId, rng)
}

function rollOneDungeonGear(floor: RoDungeonFloor, rng: () => number, jobId: string): RolledItem | null {
  const { dungeons } = loadRoContent()
  const slots = dungeons.gear.dropSlots
  const slot = slots[Math.floor(rng() * slots.length)]
  const bases = baseItemsForSlot(slot)
  if (bases.length === 0) return null
  const base = bases[Math.floor(rng() * bases.length)]
  const rarity = pickWeightedRarity(floor.gearDrop.rarityWeights, rng)
  return buildRolledItem(
    base,
    rarity,
    rollLevelInBand(floor.minLevel, floor.maxLevel, rng),
    jobId,
    rng,
  )
}

export function rollDungeonMvpGearDrops(
  floor: RoDungeonFloor,
  rng = Math.random,
  jobId = 'novice',
): RolledItem[] {
  const drops: RolledItem[] = []
  for (let r = 0; r < floor.gearDrop.mvpRolls; r++) {
    const rolled = rollOneDungeonGear(floor, rng, jobId)
    if (rolled) drops.push(rolled)
  }
  return drops
}

export function rollDungeonGear(
  floor: RoDungeonFloor,
  isMvp: boolean,
  rng = Math.random,
  jobId = 'novice',
): RolledItem | null {
  if (isMvp) {
    const drops = rollDungeonMvpGearDrops(floor, rng, jobId)
    return drops[drops.length - 1] ?? null
  }
  const chanceRoll = Math.floor(rng() * 10000)
  if (chanceRoll >= floor.gearDrop.chancePerMille) return null
  return rollOneDungeonGear(floor, rng, jobId)
}

export function rolledItemDisplayName(rolled: RolledItem): string {
  const base = loadRoContent().items.find((i) => i.id === rolled.baseItemId)
  const label = loadRoContent().dungeons.gear.rarities[rolled.rarity].label
  return `${label} ${base?.name ?? rolled.baseItemId}`
}

export function rarityColor(rarity: GearRarityId): string {
  return loadRoContent().dungeons.gear.rarities[rarity].color
}

function normalizeLegacyEffect(raw: unknown): RolledItemEffect | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as RolledItemEffect
  if (typeof o.percent !== 'number' || !o.kind) return null
  return o
}

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

const ALLOWED_EFFECT_PERCENTS = new Set([2.5, 5, 7.5, 10])

function maxAffixValueForRarity(kind: 'primary' | CombatAffixKind, rarity: GearRarityId): number {
  const range = AFFIX_RANGE[kind === 'primary' ? 'primary' : kind]
  const cap = affixCapPercentForRarity(rarity)
  return ceilingFromCapPercent(range.min, range.max, cap)
}

function clampAffixValue(affix: RolledGearAffix, rarity: GearRarityId): RolledGearAffix {
  if (affix.pool === 'primary') {
    const max = maxAffixValueForRarity('primary', rarity)
    const min = AFFIX_RANGE.primary.min
    return { ...affix, value: Math.max(min, Math.min(max, Math.floor(affix.value))) }
  }
  const max = maxAffixValueForRarity(affix.kind, rarity)
  const min = AFFIX_RANGE[affix.kind].min
  return { ...affix, value: Math.max(min, Math.min(max, Math.floor(affix.value))) }
}

function pickPrimaryAffix(
  affixes: RolledGearAffix[],
  stats: Partial<Record<PrimaryStat, number>>,
): Extract<RolledGearAffix, { pool: 'primary' }> {
  const primaries = affixes.filter((a): a is Extract<RolledGearAffix, { pool: 'primary' }> => a.pool === 'primary')
  if (primaries.length > 0) {
    return primaries.reduce((best, a) => (a.value > best.value ? a : best))
  }
  for (const [stat, value] of Object.entries(stats)) {
    if (value != null && value > 0) {
      return { pool: 'primary', stat: stat as PrimaryStat, value }
    }
  }
  return { pool: 'primary', stat: 'str', value: AFFIX_RANGE.primary.min }
}

function pickCombatAffix(affixes: RolledGearAffix[]): Extract<RolledGearAffix, { pool: 'combat' }> {
  const combat = affixes.find((a): a is Extract<RolledGearAffix, { pool: 'combat' }> => a.pool === 'combat')
  if (combat) return combat
  return { pool: 'combat', kind: 'def', value: AFFIX_RANGE.def.min }
}

function normalizeEffect(effect: RolledItemEffect | null | undefined): RolledItemEffect | null {
  if (!effect) return null
  if (effect.kind === 'critChance') {
    if (effect.percent >= 1 && effect.percent <= 25) return effect
    return null
  }
  const level = effect.level ?? 1
  if (level < 1 || level > 4) return null
  if (!ALLOWED_EFFECT_PERCENTS.has(effect.percent)) return null
  return { ...effect, level: level as 1 | 2 | 3 | 4 }
}

/** Coerce legacy multi-primary rolled gear into the current two-affix schema. */
export function normalizeRolledItem(item: RolledItem): RolledItem {
  const affixes = item.affixes ?? []
  const primary = clampAffixValue(pickPrimaryAffix(affixes, item.stats ?? {}), item.rarity)
  const combat = clampAffixValue(pickCombatAffix(affixes), item.rarity)
  const normalizedAffixes: RolledGearAffix[] = [primary, combat]
  return {
    ...item,
    affixes: normalizedAffixes,
    stats: primaryStatsFromAffixes(normalizedAffixes),
    effect: normalizeEffect(item.effect),
    slots: 2,
    cards: item.cards ?? [null, null],
  }
}

export function normalizeRolledItemsRecord(rolled: Record<string, RolledItem>): Record<string, RolledItem> {
  const out: Record<string, RolledItem> = {}
  for (const [key, item] of Object.entries(rolled)) {
    out[key] = normalizeRolledItem({ ...item, id: item.id ?? key })
  }
  return out
}

function legacyStatsToAffixes(stats: Partial<Record<PrimaryStat, number>>): RolledGearAffix[] {
  const affixes: RolledGearAffix[] = []
  for (const [stat, value] of Object.entries(stats)) {
    if (value == null || value <= 0) continue
    affixes.push({ pool: 'primary', stat: stat as PrimaryStat, value })
  }
  return affixes
}

export function parseRolledItemsRecord(raw: unknown): Record<string, RolledItem> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, RolledItem> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const o = val as RolledItem & { effect?: RolledItemEffect | null }
    if (typeof o.baseItemId !== 'string' || !o.rarity) continue
    const stats = o.stats ?? {}
    const affixes =
      Array.isArray(o.affixes) && o.affixes.length > 0 ? o.affixes : legacyStatsToAffixes(stats)
    const effect = o.effect === undefined ? normalizeLegacyEffect((val as { effect?: unknown }).effect) : o.effect
    out[key] = normalizeRolledItem({
      id: typeof o.id === 'string' ? o.id : key,
      baseItemId: o.baseItemId,
      rarity: o.rarity,
      requiredBaseLevel: o.requiredBaseLevel ?? 1,
      stats,
      affixes,
      effect,
      slots: 2,
      cards: o.cards ?? [null, null],
    })
  }
  return out
}

export function addRolledItemToSession(
  rolledItems: Record<string, RolledItem>,
  item: RolledItem,
): Record<string, RolledItem> {
  return { ...rolledItems, [item.id]: item }
}
