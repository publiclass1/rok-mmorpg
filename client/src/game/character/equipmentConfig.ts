import type { EquipSlot } from './characterState'
import type { StatBonuses } from './statFormulas'

export type EquipmentDefinition = {
  id: string
  name: string
  slot: EquipSlot
  layerColor: number
  bonuses: StatBonuses
}

export const EQUIPMENT: Record<string, EquipmentDefinition> = {
  knife: {
    id: 'knife',
    name: 'Knife',
    slot: 'weapon',
    layerColor: 0xc0c0c0,
    bonuses: { str: 1, agi: 0, vit: 0, int: 0, dex: 1, luk: 0 },
  },
  cotton_shirt: {
    id: 'cotton_shirt',
    name: 'Cotton Shirt',
    slot: 'armor',
    layerColor: 0xf5f5dc,
    bonuses: { str: 0, agi: 0, vit: 1, int: 0, dex: 0, luk: 0 },
  },
  cap: {
    id: 'cap',
    name: 'Cap',
    slot: 'headTop',
    layerColor: 0x8b4513,
    bonuses: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 1 },
  },
}

export function equipmentBonusesFromState(equipment: Record<EquipSlot, string | null>): StatBonuses {
  const total: StatBonuses = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const def = EQUIPMENT[itemId]
    if (!def) continue
    total.str += def.bonuses.str
    total.agi += def.bonuses.agi
    total.vit += def.bonuses.vit
    total.int += def.bonuses.int
    total.dex += def.bonuses.dex
    total.luk += def.bonuses.luk
  }
  return total
}
