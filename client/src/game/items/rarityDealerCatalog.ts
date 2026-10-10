import catalogJson from '../../../../content/ro/rarityDealerCatalog.json'
import type { EquipSlot } from '../character/characterState'
import type { GearRarityId } from '../../content/ro/types'

export type RarityDealerKind = 'armor' | 'head' | 'accessory'

type Catalog = {
  tiers: Array<{ level: number; rarity: GearRarityId; price: number }>
  slots: Record<string, { label: string }>
  dealerKinds: Record<RarityDealerKind, string[]>
}

const catalog = catalogJson as Catalog

export function rarityDealerSlotTabs(kind: RarityDealerKind): EquipSlot[] {
  return catalog.dealerKinds[kind] as EquipSlot[]
}

export function rarityDealerSlotLabel(slot: EquipSlot): string {
  return catalog.slots[slot]?.label ?? slot
}

export function rarityDealerStockForKind(kind: RarityDealerKind): Array<{ itemId: string; price: number }> {
  const slots = catalog.dealerKinds[kind]
  const out: Array<{ itemId: string; price: number }> = []
  for (const slot of slots) {
    for (const tier of catalog.tiers) {
      out.push({ itemId: `rarity_rd_${slot}_${tier.level}`, price: tier.price })
    }
  }
  return out
}

export function isRarityRdItemId(itemId: string): boolean {
  return itemId.startsWith('rarity_rd_')
}
