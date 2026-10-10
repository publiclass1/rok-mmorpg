import catalogJson from './ro/rarityDealerCatalog.json' with { type: 'json' }

export type RarityDealerKind = 'armor' | 'head' | 'accessory'

const catalog = catalogJson as {
  dealerKinds: Record<RarityDealerKind, string[]>
  tiers: Array<{ level: number; price: number }>
}

export function isRarityRdItemId(itemId: string): boolean {
  return itemId.startsWith('rarity_rd_')
}

export function rarityDealerStockIdsForKind(kind: RarityDealerKind): Set<string> {
  const slots = catalog.dealerKinds[kind]
  const ids = new Set<string>()
  for (const slot of slots) {
    for (const tier of catalog.tiers) {
      ids.add(`rarity_rd_${slot}_${tier.level}`)
    }
  }
  return ids
}
