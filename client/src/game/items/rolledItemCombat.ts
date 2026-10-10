import type { EquipSlot } from '../character/characterState'
import { getRolledItem } from './rolledItemRegistry'
import type { RolledDamageEffectKind } from './rolledItem'
import {
  combatAffixTotalsFromAffixes,
  emptyCombatAffixTotals,
  type CombatAffixKind,
  type EquippedCombatAffixTotals,
} from './rollGearAffixes'

export function sumEquippedCombatAffixes(
  equipment: Record<EquipSlot, string | null>,
): EquippedCombatAffixTotals {
  const totals = emptyCombatAffixTotals()
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const rolled = getRolledItem(itemId)
    if (!rolled?.affixes?.length) continue
    const piece = combatAffixTotalsFromAffixes(rolled.affixes)
    for (const kind of Object.keys(piece) as CombatAffixKind[]) {
      totals[kind] += piece[kind]
    }
  }
  return totals
}

export function sumEquippedRolledDamagePercent(
  equipment: Record<EquipSlot, string | null>,
  kind: RolledDamageEffectKind,
): number {
  let total = 0
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const rolled = getRolledItem(itemId)
    if (!rolled?.effect || rolled.effect.kind !== kind) continue
    total += rolled.effect.percent
  }
  return total
}

export function sumEquippedCritDamagePercent(equipment: Record<EquipSlot, string | null>): number {
  let total = 0
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const rolled = getRolledItem(itemId)
    if (!rolled?.effect || rolled.effect.kind !== 'critDamage') continue
    total += rolled.effect.percent
  }
  return total
}

export function sumEquippedGearAspdBonus(equipment: Record<EquipSlot, string | null>): number {
  return sumEquippedCombatAffixes(equipment).aspd
}
