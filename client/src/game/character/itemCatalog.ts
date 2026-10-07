import { loadRoContent } from '../../content/ro/loadContent'
import type { RoItem, WeaponClass } from '../../content/ro/types'
import {
  isRolledItemId,
  parseRolledBaseItemId,
  rolledItemDisplayName,
  type RolledItem,
} from '../items/rolledItem'
import { getRolledItem } from '../items/rolledItemRegistry'
import { getEquipmentDefinition } from './equipmentConfig'
import type { ItemEquipRequirements } from './equipRequirements'
import type { StatBonuses } from './statFormulas'

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

function baseItemForId(itemId: string): RoItem | undefined {
  if (isRolledItemId(itemId)) {
    const baseId = parseRolledBaseItemId(itemId)
    return baseId ? ITEMS_BY_ID[baseId] : undefined
  }
  return ITEMS_BY_ID[itemId]
}

export function getItemDefinition(itemId: string): RoItem | undefined {
  const base = baseItemForId(itemId)
  if (!base) return undefined
  const rolled = getRolledItem(itemId)
  if (!rolled) return base
  const mergedBonuses: StatBonuses = {
    str: (base.bonuses?.str ?? 0) + (rolled.stats.str ?? 0),
    agi: (base.bonuses?.agi ?? 0) + (rolled.stats.agi ?? 0),
    vit: (base.bonuses?.vit ?? 0) + (rolled.stats.vit ?? 0),
    int: (base.bonuses?.int ?? 0) + (rolled.stats.int ?? 0),
    dex: (base.bonuses?.dex ?? 0) + (rolled.stats.dex ?? 0),
    luk: (base.bonuses?.luk ?? 0) + (rolled.stats.luk ?? 0),
  }
  return {
    ...base,
    name: rolledItemDisplayName(rolled),
    requiredBaseLevel: rolled.requiredBaseLevel,
    bonuses: mergedBonuses,
  }
}

export function getItemCombatStats(itemId: string): ItemCombatStats | null {
  const item = getItemDefinition(itemId)
  if (!item || item.type !== 'weapon') return null
  return {
    weaponAtk: item.weaponAtk ?? 0,
    weaponSize: item.weaponSize ?? 'medium',
    attackElement: item.attackElement ?? 'neutral',
  }
}

export function getItemWeaponClass(itemId: string): WeaponClass | null {
  const item = getItemDefinition(itemId)
  if (!item || item.type !== 'weapon' || !item.weaponClass) return null
  return item.weaponClass
}

export function getConsumableEffect(itemId: string) {
  const item = ITEMS_BY_ID[itemId]
  if (!item || item.type !== 'consumable') return null
  return item.consumable ?? null
}

export function getItemDisplayName(itemId: string): string {
  const rolled = getRolledItem(itemId)
  if (rolled) return rolledItemDisplayName(rolled)
  const def = getEquipmentDefinition(itemId)
  if (def) return def.name
  return ITEMS_BY_ID[itemId]?.name ?? ITEM_NAMES[itemId] ?? itemId
}

export function isEquippable(itemId: string): boolean {
  return Boolean(getEquipmentDefinition(itemId))
}

export function isConsumable(itemId: string): boolean {
  if (isRolledItemId(itemId)) return false
  return ITEMS_BY_ID[itemId]?.type === 'consumable'
}

export function isRolledGearItemId(itemId: string): boolean {
  return isRolledItemId(itemId)
}

export function getEquipColor(itemId: string): number {
  return getEquipmentDefinition(itemId)?.layerColor ?? 0x6b7280
}

export function getItemIconUrl(itemId: string): string | null {
  const baseId = isRolledItemId(itemId) ? parseRolledBaseItemId(itemId) : itemId
  if (!baseId) return null
  const item = ITEMS_BY_ID[baseId]
  if (!item) return null
  if (item.iconFile) return item.iconFile
  if (item.type === 'weapon') return `/items/weapons/${baseId}.svg`
  return null
}

export function isWeaponItem(itemId: string): boolean {
  const baseId = isRolledItemId(itemId) ? parseRolledBaseItemId(itemId) : itemId
  if (!baseId) return false
  return ITEMS_BY_ID[baseId]?.type === 'weapon'
}

export function getRolledItemOrNull(itemId: string): RolledItem | null {
  return getRolledItem(itemId)
}

export function getItemEquipRequirementsFromCatalog(itemId: string): ItemEquipRequirements | null {
  const item = getItemDefinition(itemId)
  if (!item?.equipSlot) return null
  const jobIds = item.requiredJobIds
  return {
    requiredBaseLevel: item.requiredBaseLevel ?? 1,
    requiredJobIds: jobIds && jobIds.length > 0 ? jobIds : null,
  }
}
