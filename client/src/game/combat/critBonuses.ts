import type { EquipSlot } from '../character/characterState'
import { getItemDefinition } from '../character/itemCatalog'
import { getRolledItem } from '../items/rolledItemRegistry'
import { combatAffixTotalsFromAffixes } from '../items/rollGearAffixes'

export function critChanceFromItemId(itemId: string): number {
  const def = getItemDefinition(itemId)
  let total = def?.combatBonuses?.critChance ?? 0
  const rolled = getRolledItem(itemId)
  if (rolled?.effect?.kind === 'critChance') {
    total += rolled.effect.percent
  }
  if (rolled?.affixes?.length) {
    total += combatAffixTotalsFromAffixes(rolled.affixes).critRate
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

export function sumEquippedCritResist(equipment: Record<EquipSlot, string | null>): number {
  let total = 0
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const rolled = getRolledItem(itemId)
    if (!rolled?.affixes?.length) continue
    total += combatAffixTotalsFromAffixes(rolled.affixes).critResist
  }
  return total
}
