import { loadRoContent } from '../../content/ro/loadContent'
import type { GearRarityId } from '../../content/ro/types'
import { isRolledItemId, parseRolledBaseItemId } from '../items/rolledItem'
import { getRolledItem } from '../items/rolledItemRegistry'
import npcsJson from '../../../../server/prisma/data/npcs.json'

export const SELL_BACK_RATIO = 0.5
export const WEIGHT_ZENY_FACTOR = 10

type NpcSeedRow = {
  config?: {
    buys?: Array<{ itemId?: string; price?: number }>
    stock?: Array<{ itemId?: string; price?: number }>
  }
}

const GEAR_RARITY_ORDER: GearRarityId[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'artifact',
]

function rarityTier(rarity: GearRarityId | undefined): number {
  if (!rarity) return 0
  const i = GEAR_RARITY_ORDER.indexOf(rarity)
  return i >= 0 ? i : 0
}

function maxPrice(map: Map<string, number>, itemId: string, price: number) {
  if (price <= 0) return
  const prev = map.get(itemId) ?? 0
  if (price > prev) map.set(itemId, price)
}

let cachedBasePrices: Map<string, number> | null = null

export function buildGlobalNpcSellPrices(): Map<string, number> {
  const map = new Map<string, number>()
  const npcs = npcsJson as NpcSeedRow[]
  for (const npc of npcs) {
    const config = npc.config
    if (!config) continue
    for (const row of config.buys ?? []) {
      if (typeof row?.itemId !== 'string') continue
      const price = Number(row.price)
      if (Number.isFinite(price) && price >= 0) maxPrice(map, row.itemId, Math.floor(price))
    }
    for (const row of config.stock ?? []) {
      if (typeof row?.itemId !== 'string') continue
      const price = Number(row.price)
      if (Number.isFinite(price) && price >= 0) {
        maxPrice(map, row.itemId, Math.floor(price * SELL_BACK_RATIO))
      }
    }
  }
  return map
}

function baseSellPrices(): Map<string, number> {
  if (!cachedBasePrices) cachedBasePrices = buildGlobalNpcSellPrices()
  return cachedBasePrices
}

function catalogFallbackPrice(itemId: string): number {
  const item = loadRoContent().items.find((i) => i.id === itemId)
  if (!item) return 0
  const weight = item.weight > 0 ? item.weight : 1
  return Math.max(1, Math.floor(weight * WEIGHT_ZENY_FACTOR))
}

export function resolveBaseItemSellUnitPrice(itemId: string): number {
  const fromNpc = baseSellPrices().get(itemId)
  if (fromNpc != null && fromNpc > 0) return fromNpc
  return catalogFallbackPrice(itemId)
}

export function resolveNpcSellUnitPrice(itemId: string): number {
  const rolled = getRolledItem(itemId)
  const baseId = parseRolledBaseItemId(itemId) ?? itemId
  let unit = resolveBaseItemSellUnitPrice(baseId)
  if (unit <= 0) return 0
  if (isRolledItemId(itemId)) {
    const roItem = loadRoContent().items.find((i) => i.id === baseId)
    const tier = rarityTier(rolled?.rarity ?? roItem?.rarity ?? undefined)
    const mult = 1 + tier * 0.5
    unit = Math.max(1, Math.floor(unit * mult))
  }
  return unit
}

export function globalNpcSellPriceRecord(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of loadRoContent().items) {
    const price = resolveBaseItemSellUnitPrice(item.id)
    if (price > 0) out[item.id] = price
  }
  return out
}
