// @ts-nocheck
import gearJson from '../ro/dungeonsGear.json' with { type: 'json' }
import itemsJson from '../ro/items.json' with { type: 'json' }
import type { CombatAffixKind, GearRarityId, PrimaryStat, RolledGearAffix, RolledItem } from './types.js'
import { affixCapPercentForRarity, ceilingFromCapPercent, primaryStatsFromAffixes } from './rollGearAffixes.js'

const ITEM_IDS = new Set((itemsJson as { items: { id: string }[] }).items.map((i) => i.id))

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

const ALLOWED_EFFECT_PERCENTS = new Set([2.5, 5, 7.5, 10])

function maxAffixValueForRarity(
  kind: 'primary' | CombatAffixKind,
  rarity: GearRarityId,
): number {
  const range = AFFIX_RANGE[kind === 'primary' ? 'primary' : kind]
  const cap = affixCapPercentForRarity(rarity)
  return ceilingFromCapPercent(range.min, range.max, cap)
}

function parseRolledBaseItemId(itemId: string): string | null {
  if (!itemId.startsWith('ri:')) return null
  const rest = itemId.slice(3)
  const lastColon = rest.lastIndexOf(':')
  if (lastColon <= 0) return null
  return rest.slice(0, lastColon)
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

function normalizeEffect(effect: RolledItem['effect']): RolledItem['effect'] {
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

/** Coerce pre–two-affix rolled gear (and invalid option-3 effects) into the current schema. */
export function normalizeRolledItemRecord(item: RolledItem): RolledItem {
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

export function normalizeRolledItemsPayload(raw: unknown): Record<string, RolledItem> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, RolledItem> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const row = val as RolledItem
    const id = typeof row.id === 'string' ? row.id : key
    out[key] = normalizeRolledItemRecord({ ...row, id })
  }
  return out
}

function validateAffix(affix: RolledGearAffix, rarity: GearRarityId): string | null {
  if (affix.pool === 'primary') {
    const max = maxAffixValueForRarity('primary', rarity)
    if (affix.value < AFFIX_RANGE.primary.min || affix.value > max) return 'primary affix out of range'
    return null
  }
  const max = maxAffixValueForRarity(affix.kind, rarity)
  if (affix.value < AFFIX_RANGE[affix.kind].min || affix.value > max) return `${affix.kind} affix out of range`
  return null
}

export function validateRolledItemRecord(item: RolledItem): string | null {
  if (!item.id.startsWith('ri:')) return 'invalid rolled id'
  if (!ITEM_IDS.has(item.baseItemId)) return `unknown base ${item.baseItemId}`
  const rarities = (gearJson as { rarities: Record<string, unknown> }).rarities
  if (!rarities[item.rarity]) return 'invalid rarity'
  const affixes = item.affixes ?? []
  if (affixes.length !== 2) return 'rolled affix count must be 2'
  if (affixes[0]?.pool !== 'primary') return 'first affix must be option 1 primary'
  if (affixes[1]?.pool !== 'combat') return 'second affix must be option 2 combat'
  for (const affix of affixes) {
    const err = validateAffix(affix, item.rarity)
    if (err) return err
  }
  if (item.effect) {
    if (item.effect.kind === 'critChance') {
      if (item.effect.percent < 1 || item.effect.percent > 25) return 'legacy crit effect out of range'
    } else {
      const level = item.effect.level ?? 1
      if (level < 1 || level > 4) return 'invalid effect level'
      if (!ALLOWED_EFFECT_PERCENTS.has(item.effect.percent)) return 'invalid effect percent'
    }
  }
  return null
}

export function validateRolledItemsPayload(
  sessionInventory: unknown,
  rolledItemsRaw: unknown,
): string | null {
  const rolledMap = normalizeRolledItemsPayload(rolledItemsRaw)

  for (const [key, val] of Object.entries(rolledMap)) {
    if (!val || typeof val !== 'object') return 'invalid rolled_items entry'
    const item = val as RolledItem
    if (item.id !== key) return 'rolled_items key mismatch'
    const err = validateRolledItemRecord(item)
    if (err) return `rolled item ${key}: ${err}`
    const base = parseRolledBaseItemId(key)
    if (base !== item.baseItemId) return 'rolled baseItemId mismatch'
  }

  if (!Array.isArray(sessionInventory)) return null
  for (const entry of sessionInventory) {
    let itemId: string | null = null
    if (typeof entry === 'string') itemId = entry
    else if (entry && typeof entry === 'object' && typeof entry.itemId === 'string') {
      itemId = entry.itemId
    }
    if (!itemId?.startsWith('ri:')) continue
    if (!rolledMap[itemId]) return `missing rolled_items for ${itemId}`
  }

  return null
}
