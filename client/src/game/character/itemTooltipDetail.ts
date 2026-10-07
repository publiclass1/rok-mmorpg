import {
  getConsumableEffect,
  getItemCombatStats,
  getItemDefinition,
  getItemDisplayName,
  getRolledItemOrNull,
} from './itemCatalog'
import { formatEquipRequirements } from './equipRequirements'
import { getItemRarity, isNpcCosmeticRarityItem, rarityColor, rarityLabel } from '../items/itemRarity'

export type ItemTooltipDetail = {
  name: string
  nameColor?: string
  subtitleLines: string[]
  statLines: string[]
  effectLines: string[]
  metaLines: string[]
}

const SLOT_LABELS: Record<string, string> = {
  headTop: 'Head (Top)',
  headMiddle: 'Head (Mid)',
  headLower: 'Head (Low)',
  weapon: 'Weapon',
  armor: 'Armor',
  offhand: 'Off-hand',
  garment: 'Garment',
  boots: 'Boots',
  accLeft: 'Accessory (L)',
  accRight: 'Accessory (R)',
}

function bonusStatLines(bonuses: Record<string, number> | null | undefined): string[] {
  if (!bonuses) return []
  return Object.entries(bonuses)
    .filter(([, v]) => v != null && v > 0)
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)
}

export function buildItemTooltipDetail(
  itemId: string,
  options?: { quantity?: number },
): ItemTooltipDetail {
  const name = getItemDisplayName(itemId)
  const displayName =
    options?.quantity != null && options.quantity > 1 ? `${name} ×${options.quantity}` : name

  const rolled = getRolledItemOrNull(itemId)
  const cosmeticRarity = !rolled ? getItemRarity(itemId) : null
  const item = getItemDefinition(itemId)
  const subtitleLines: string[] = []
  const statLines: string[] = []
  const effectLines: string[] = []
  const metaLines: string[] = []

  if (item) {
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1)
    if (item.equipSlot) {
      const slot = SLOT_LABELS[item.equipSlot] ?? item.equipSlot
      subtitleLines.push(`${typeLabel} · ${slot}`)
    } else {
      subtitleLines.push(typeLabel)
    }

    const req = formatEquipRequirements(itemId)
    if (req) subtitleLines.push(req)

    const combat = getItemCombatStats(itemId)
    if (combat) {
      statLines.push(`ATK ${combat.weaponAtk}`)
      statLines.push(`Size: ${combat.weaponSize} · ${combat.attackElement}`)
      if (item.weaponClass) {
        statLines.push(`Class: ${item.weaponClass}`)
      }
    }

    statLines.push(...bonusStatLines(item.bonuses))

    if (item.combatBonuses?.critChance) {
      statLines.push(`Crit +${item.combatBonuses.critChance}%`)
    }

    if (item.weight > 0) metaLines.push(`Weight: ${item.weight}`)
    if (item.stackMax > 1) metaLines.push(`Stack: ${item.stackMax}`)
  }

  if (rolled) {
    subtitleLines.unshift(
      `${rolled.rarity.charAt(0).toUpperCase() + rolled.rarity.slice(1)} · Lv ${rolled.requiredBaseLevel}`,
    )
    effectLines.push(
      rolled.effect.kind === 'critChance'
        ? `+${rolled.effect.percent}% critical hit chance`
        : `+${rolled.effect.percent}% ${rolled.effect.kind} damage`,
    )
    effectLines.push('Card slots: [ ] [ ]')
  } else if (cosmeticRarity && isNpcCosmeticRarityItem(itemId)) {
    subtitleLines.unshift(rarityLabel(cosmeticRarity))
    metaLines.push('Cosmetic — no stat bonuses')
  }

  const consumable = getConsumableEffect(itemId)
  if (consumable) {
    if (consumable.healHp) effectLines.push(`Restores ${consumable.healHp} HP`)
    if (consumable.healSp) effectLines.push(`Restores ${consumable.healSp} SP`)
  }

  return {
    name: displayName,
    nameColor:
      rolled ? rarityColor(rolled.rarity) : cosmeticRarity ? rarityColor(cosmeticRarity) : undefined,
    subtitleLines,
    statLines,
    effectLines,
    metaLines,
  }
}
