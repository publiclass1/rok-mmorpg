import { loadRoContent } from '../../content/ro/loadContent'
import { parseLayerColor } from '../../content/ro/parseColor'
import type { EquipSlot } from './characterState'
import type { StatBonuses } from './statFormulas'

export type EquipmentDefinition = {
  id: string
  name: string
  slot: EquipSlot
  layerColor: number
  bonuses: StatBonuses
}

function buildEquipment(): Record<string, EquipmentDefinition> {
  const { items } = loadRoContent()
  const out: Record<string, EquipmentDefinition> = {}
  for (const item of items) {
    if (!item.equipSlot || !item.bonuses || !item.layerColor) continue
    out[item.id] = {
      id: item.id,
      name: item.name,
      slot: item.equipSlot as EquipSlot,
      layerColor: parseLayerColor(item.layerColor),
      bonuses: item.bonuses,
    }
  }
  return out
}

export const EQUIPMENT: Record<string, EquipmentDefinition> = buildEquipment()

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
