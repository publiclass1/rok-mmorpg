// @ts-nocheck
import gearJson from '../ro/dungeonsGear.json' with { type: 'json' }
import itemsJson from '../ro/items.json' with { type: 'json' }
import type { CombatAffixKind, GearRarityId, RolledGearAffix, RolledItem } from './types.js'
import { affixCapPercentForRarity, ceilingFromCapPercent } from './rollGearAffixes.js'

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
  const rolledMap =
    rolledItemsRaw && typeof rolledItemsRaw === 'object'
      ? (rolledItemsRaw as Record<string, RolledItem>)
      : {}

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
