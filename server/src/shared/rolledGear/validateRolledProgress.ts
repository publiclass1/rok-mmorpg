// @ts-nocheck
import gearJson from '../ro/dungeonsGear.json' with { type: 'json' }
import itemsJson from '../ro/items.json' with { type: 'json' }
import type { CombatAffixKind, GearRarityId, RolledGearAffix, RolledItem } from './types.js'

const GEAR_RARITIES = gearJson.rarities as Record<GearRarityId, { statMin: number }>
const ITEM_IDS = new Set((itemsJson as { items: { id: string }[] }).items.map((i) => i.id))

const GEAR_RARITY_ORDER: GearRarityId[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'artifact',
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

const ALLOWED_EFFECT_PERCENTS = new Set([2.5, 5, 7.5, 10])

function rarityTier(rarity: GearRarityId): number {
  const i = GEAR_RARITY_ORDER.indexOf(rarity)
  return i >= 0 ? i : 0
}

function maxAffixValue(kind: keyof typeof AFFIX_RANGE | CombatAffixKind, rarity: GearRarityId): number {
  const range = AFFIX_RANGE[kind === 'primary' ? 'primary' : kind]
  const tier = rarityTier(rarity)
  const maxTier = GEAR_RARITY_ORDER.length - 1
  const statMin = GEAR_RARITIES[rarity]?.statMin ?? range.min
  const lo = Math.min(range.max, Math.max(range.min, statMin))
  const hi = Math.min(range.max, range.min + Math.floor(((range.max - range.min) * tier) / maxTier))
  return Math.max(lo, hi)
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
    const max = maxAffixValue('primary', rarity)
    if (affix.value < 1 || affix.value > max) return 'primary affix out of range'
    return null
  }
  const max = maxAffixValue(affix.kind, rarity)
  if (affix.value < AFFIX_RANGE[affix.kind].min || affix.value > max) return `${affix.kind} affix out of range`
  return null
}

export function validateRolledItemRecord(item: RolledItem): string | null {
  if (!item.id.startsWith('ri:')) return 'invalid rolled id'
  if (!ITEM_IDS.has(item.baseItemId)) return `unknown base ${item.baseItemId}`
  if (!GEAR_RARITIES[item.rarity]) return 'invalid rarity'
  const affixes = item.affixes ?? []
  if (affixes.length !== 2) return 'rolled affix count must be 2'
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
