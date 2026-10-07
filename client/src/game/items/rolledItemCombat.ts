import type { EquipSlot } from '../character/characterState'
import { getRolledItem } from './rolledItemRegistry'
import type { RolledEffectKind } from './rolledItem'

export function sumEquippedRolledDamagePercent(
  equipment: Record<EquipSlot, string | null>,
  kind: RolledEffectKind,
): number {
  let total = 0
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const rolled = getRolledItem(itemId)
    if (!rolled || rolled.effect.kind !== kind) continue
    total += rolled.effect.percent
  }
  return total
}
