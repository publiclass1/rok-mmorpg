import { loadRoContent } from '../../content/ro/loadContent'
import { parseLayerColor } from '../../content/ro/parseColor'
import { isRolledItemId, parseRolledBaseItemId, rolledItemDisplayName } from '../items/rolledItem'
import { getRolledItem } from '../items/rolledItemRegistry'
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

export function getEquipmentDefinition(itemId: string | null): EquipmentDefinition | null {
  if (!itemId) return null
  const rolled = getRolledItem(itemId)
  const baseId = isRolledItemId(itemId) ? parseRolledBaseItemId(itemId) : itemId
  if (!baseId) return null
  const base = EQUIPMENT[baseId]
  if (!base) return null
  if (!rolled) return base
  const merged: StatBonuses = {
    str: base.bonuses.str + (rolled.stats.str ?? 0),
    agi: base.bonuses.agi + (rolled.stats.agi ?? 0),
    vit: base.bonuses.vit + (rolled.stats.vit ?? 0),
    int: base.bonuses.int + (rolled.stats.int ?? 0),
    dex: base.bonuses.dex + (rolled.stats.dex ?? 0),
    luk: base.bonuses.luk + (rolled.stats.luk ?? 0),
  }
  return {
    id: itemId,
    name: rolledItemDisplayName(rolled),
    slot: base.slot,
    layerColor: base.layerColor,
    bonuses: merged,
  }
}

export function equipmentBonusesFromState(equipment: Record<EquipSlot, string | null>): StatBonuses {
  const total: StatBonuses = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const def = getEquipmentDefinition(itemId)
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
