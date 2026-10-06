import { loadRoContent } from '../../content/ro/loadContent'
import { EQUIPMENT } from './equipmentConfig'

const ro = loadRoContent()
const ITEMS_BY_ID = Object.fromEntries(ro.items.map((item) => [item.id, item]))

const ITEM_NAMES: Record<string, string> = {
  red_potion: 'Red Potion',
  jellopy: 'Jellopy',
}

export type ItemCombatStats = {
  weaponAtk: number
  weaponSize: 'small' | 'medium' | 'large'
  attackElement: string
}

export function getItemDefinition(itemId: string) {
  return ITEMS_BY_ID[itemId]
}

export function getItemCombatStats(itemId: string): ItemCombatStats | null {
  const item = ITEMS_BY_ID[itemId]
  if (!item || item.type !== 'weapon') return null
  return {
    weaponAtk: item.weaponAtk ?? 0,
    weaponSize: item.weaponSize ?? 'medium',
    attackElement: item.attackElement ?? 'neutral',
  }
}

export function getConsumableEffect(itemId: string) {
  const item = ITEMS_BY_ID[itemId]
  if (!item || item.type !== 'consumable') return null
  return item.consumable ?? null
}

export function getItemDisplayName(itemId: string): string {
  return EQUIPMENT[itemId]?.name ?? ITEMS_BY_ID[itemId]?.name ?? ITEM_NAMES[itemId] ?? itemId
}

export function isEquippable(itemId: string): boolean {
  return Boolean(EQUIPMENT[itemId])
}

export function isConsumable(itemId: string): boolean {
  return ITEMS_BY_ID[itemId]?.type === 'consumable'
}

export function getEquipColor(itemId: string): number {
  return EQUIPMENT[itemId]?.layerColor ?? 0x6b7280
}
