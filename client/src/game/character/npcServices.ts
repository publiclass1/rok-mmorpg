import type { NpcRow } from '../../types/database'

export type ShopStockEntry = { itemId: string; price: number }
export type ShopBuyEntry = { itemId: string; price: number }

export function shopStockFromNpcConfig(config: NpcRow['config']): ShopStockEntry[] {
  const raw = config?.stock
  if (!Array.isArray(raw)) return []
  const out: ShopStockEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const itemId = (entry as { itemId?: unknown }).itemId
    const price = (entry as { price?: unknown }).price
    if (typeof itemId !== 'string' || typeof price !== 'number' || price < 0) continue
    out.push({ itemId, price: Math.floor(price) })
  }
  return out
}

export function shopBuysFromNpcConfig(config: NpcRow['config']): ShopBuyEntry[] {
  const raw = config?.buys
  if (!Array.isArray(raw)) return []
  const out: ShopBuyEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const itemId = (entry as { itemId?: unknown }).itemId
    const price = (entry as { price?: unknown }).price
    if (typeof itemId !== 'string' || typeof price !== 'number' || price < 0) continue
    out.push({ itemId, price: Math.floor(price) })
  }
  return out
}

export function healerZenyCost(config: NpcRow['config']): number {
  const cost = config?.zenyCost
  return typeof cost === 'number' && cost > 0 ? Math.floor(cost) : 0
}

export function isRarityTabShop(config: NpcRow['config']): boolean {
  return config?.shopLayout === 'rarityTabs'
}

export function isRaritySlotTabShop(config: NpcRow['config']): boolean {
  return config?.shopLayout === 'raritySlotTabs'
}
