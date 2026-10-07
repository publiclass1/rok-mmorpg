import { isConsumable } from './itemCatalog'
import { SKILLS, canPlaceSkillOnBar } from './skillsConfig'
import type { CharacterSessionState } from './characterState'

export function isSkillBarConsumable(entry: string): boolean {
  if (!isConsumable(entry)) return false
  return SKILLS[entry] == null
}

export function canPlaceOnSkillBar(
  entryId: string,
  jobId: string,
  skills: Record<string, number>,
): boolean {
  if (isSkillBarConsumable(entryId)) return true
  return canPlaceSkillOnBar(entryId, jobId, skills)
}

export function findSessionStackIndex(state: CharacterSessionState, itemId: string): number {
  return state.sessionInventory.findIndex((s) => s.itemId === itemId && s.quantity > 0)
}

type SessionInventoryHolder = Pick<CharacterSessionState, 'sessionInventory'>

export function sessionItemQuantity(state: SessionInventoryHolder, itemId: string): number {
  let total = 0
  for (const slot of state.sessionInventory) {
    if (slot.itemId === itemId) total += slot.quantity
  }
  return total
}
