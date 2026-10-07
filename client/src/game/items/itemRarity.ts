import { loadRoContent } from '../../content/ro/loadContent'
import type { GearRarityId } from '../../content/ro/types'
import type { EquipSlot } from '../character/characterState'
import { isRolledItemId } from './rolledItem'
import { rarityColor } from './rolledItem'
import { getRolledItem } from './rolledItemRegistry'

export { rarityColor }

export const GEAR_RARITY_ORDER: GearRarityId[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
  'artifact',
]

export function rarityTier(rarity: GearRarityId): number {
  const i = GEAR_RARITY_ORDER.indexOf(rarity)
  return i >= 0 ? i : 0
}

export function maxRarity(a: GearRarityId | null, b: GearRarityId | null): GearRarityId | null {
  if (!a) return b
  if (!b) return a
  return rarityTier(a) >= rarityTier(b) ? a : b
}

export function getBaseItemRarity(itemId: string): GearRarityId | null {
  const item = loadRoContent().items.find((i) => i.id === itemId)
  return item?.rarity ?? null
}

export function getItemRarity(itemId: string): GearRarityId | null {
  const rolled = getRolledItem(itemId)
  if (rolled) return rolled.rarity
  if (isRolledItemId(itemId)) return null
  return getBaseItemRarity(itemId)
}

export function isNpcCosmeticRarityItem(itemId: string): boolean {
  const item = loadRoContent().items.find((i) => i.id === itemId)
  return item?.dungeonRollable === false && item.rarity != null
}

export function rarityLabel(rarity: GearRarityId): string {
  return loadRoContent().dungeons.gear.rarities[rarity].label
}

export function highestEquippedRarity(
  equipment: Record<EquipSlot, string | null>,
): GearRarityId | null {
  let best: GearRarityId | null = null
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    best = maxRarity(best, getItemRarity(itemId))
  }
  return best
}
