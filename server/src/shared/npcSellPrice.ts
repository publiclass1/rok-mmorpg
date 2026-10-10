import npcsJson from '../../prisma/data/npcs.json' with { type: 'json' }
import itemsJson from './ro/items.json' with { type: 'json' }

export const SELL_BACK_RATIO = 0.5
export const WEIGHT_ZENY_FACTOR = 10

const ROLLED_PREFIX = 'ri:'

type NpcSeedRow = {
  config?: {
    buys?: Array<{ itemId?: string; price?: number }>
    stock?: Array<{ itemId?: string; price?: number }>
  }
}

type RoItemRow = { id: string; weight?: number; rarity?: string }

const ITEMS_BY_ID = Object.fromEntries(
  (itemsJson as { items: RoItemRow[] }).items.map((i) => [i.id, i]),
)

const GEAR_RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'artifact']

function rarityTier(rarity: string | undefined): number {
  if (!rarity) return 0
  const i = GEAR_RARITY_ORDER.indexOf(rarity)
  return i >= 0 ? i : 0
}

function parseRolledBaseItemId(itemId: string): string | null {
  if (!itemId.startsWith(ROLLED_PREFIX)) return null
  const rest = itemId.slice(ROLLED_PREFIX.length)
  const lastColon = rest.lastIndexOf(':')
  if (lastColon <= 0) return null
  return rest.slice(0, lastColon)
}

function maxPrice(map: Map<string, number>, itemId: string, price: number) {
  if (price <= 0) return
  const prev = map.get(itemId) ?? 0
  if (price > prev) map.set(itemId, price)
}

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

let cachedBasePrices: Map<string, number> | null = null

function baseSellPrices(): Map<string, number> {
  if (!cachedBasePrices) cachedBasePrices = buildGlobalNpcSellPrices()
  return cachedBasePrices
}

function catalogFallbackPrice(itemId: string): number {
  const item = ITEMS_BY_ID[itemId]
  if (!item) return 0
  const weight = typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1
  return Math.max(1, Math.floor(weight * WEIGHT_ZENY_FACTOR))
}

/** Sell price for a base catalog item id (not rolled). */
export function resolveBaseItemSellUnitPrice(itemId: string): number {
  const fromNpc = baseSellPrices().get(itemId)
  if (fromNpc != null && fromNpc > 0) return fromNpc
  return catalogFallbackPrice(itemId)
}

/** Sell price for inventory item id (base or `ri:` rolled instance). */
export function resolveNpcSellUnitPrice(
  itemId: string,
  rolledRarity?: string | null,
): number {
  const baseId = parseRolledBaseItemId(itemId) ?? itemId
  let unit = resolveBaseItemSellUnitPrice(baseId)
  if (unit <= 0) return 0
  if (parseRolledBaseItemId(itemId)) {
    const tier = rarityTier(rolledRarity ?? ITEMS_BY_ID[baseId]?.rarity)
    const mult = 1 + tier * 0.5
    unit = Math.max(1, Math.floor(unit * mult))
  }
  return unit
}
