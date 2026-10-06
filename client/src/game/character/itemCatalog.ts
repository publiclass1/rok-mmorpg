import { EQUIPMENT } from './equipmentConfig'

const ITEM_NAMES: Record<string, string> = {
  red_potion: 'Red Potion',
}

export function getItemDisplayName(itemId: string): string {
  return EQUIPMENT[itemId]?.name ?? ITEM_NAMES[itemId] ?? itemId
}

export function isEquippable(itemId: string): boolean {
  return Boolean(EQUIPMENT[itemId])
}

export function getEquipColor(itemId: string): number {
  return EQUIPMENT[itemId]?.layerColor ?? 0x6b7280
}
