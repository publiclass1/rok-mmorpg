import type { EquipSlot } from '../character/characterState'
import { getItemDefinition } from '../character/itemCatalog'
import { getRolledItem } from '../items/rolledItemRegistry'

export function critChanceFromItemId(itemId: string): number {
  const def = getItemDefinition(itemId)
  let total = def?.combatBonuses?.critChance ?? 0
  const rolled = getRolledItem(itemId)
  if (rolled?.effect.kind === 'critChance') {
    total += rolled.effect.percent
  }
  return total
}

export function sumEquippedCritChancePercent(equipment: Record<EquipSlot, string | null>): number {
  let total = 0
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    total += critChanceFromItemId(itemId)
  }
  return total
}
