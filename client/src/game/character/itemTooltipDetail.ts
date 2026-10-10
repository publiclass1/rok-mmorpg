import {
  getConsumableEffect,
  getItemCombatStats,
  getItemDefinition,
  getItemDisplayName,
  getRolledItemOrNull,
} from './itemCatalog'
import { formatEquipRequirements } from './equipRequirements'
import { getItemRarity, isNpcCosmeticRarityItem, rarityColor, rarityLabel } from '../items/itemRarity'
import { rolledGearAffixToRow, rolledSpecialEffectToRow } from '../items/rollGearAffixes'

export type ItemTooltipRowVariant = 'default' | 'bonus' | 'roll' | 'effect' | 'muted'

export type ItemTooltipRow = {
  label: string
  value: string
  variant?: ItemTooltipRowVariant
}

export type ItemTooltipSection = {
  title?: string
  rows: ItemTooltipRow[]
}

export type ItemTooltipDetail = {
  name: string
  nameColor?: string
  subtitleLines: string[]
  sections: ItemTooltipSection[]
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

const STAT_LABELS: Record<string, string> = {
  str: 'STR',
  agi: 'AGI',
  vit: 'VIT',
  int: 'INT',
  dex: 'DEX',
  luk: 'LUK',
}

function pushSection(sections: ItemTooltipSection[], section: ItemTooltipSection) {
  if (section.rows.length === 0) return
  sections.push(section)
}

function baseStatRows(bonuses: Record<string, number> | null | undefined): ItemTooltipRow[] {
  if (!bonuses) return []
  return Object.entries(bonuses)
    .filter(([, v]) => v != null && v > 0)
    .map(([k, v]) => ({
      label: STAT_LABELS[k] ?? k.toUpperCase(),
      value: `+${v}`,
      variant: 'bonus' as const,
    }))
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
  const sections: ItemTooltipSection[] = []

  const infoRows: ItemTooltipRow[] = []
  const combatRows: ItemTooltipRow[] = []
  const statRows: ItemTooltipRow[] = []
  const effectRows: ItemTooltipRow[] = []
  const metaRows: ItemTooltipRow[] = []

  if (item) {
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1)
    infoRows.push({ label: 'Type', value: typeLabel })
    if (item.equipSlot) {
      infoRows.push({ label: 'Slot', value: SLOT_LABELS[item.equipSlot] ?? item.equipSlot })
    }

    const req = formatEquipRequirements(itemId)
    if (req) infoRows.push({ label: 'Requirement', value: req })

    const combat = getItemCombatStats(itemId)
    if (combat) {
      combatRows.push({ label: 'ATK', value: String(combat.weaponAtk) })
      combatRows.push({
        label: 'Attack size',
        value: combat.weaponSize.charAt(0).toUpperCase() + combat.weaponSize.slice(1),
      })
      combatRows.push({
        label: 'Element',
        value: combat.attackElement.charAt(0).toUpperCase() + combat.attackElement.slice(1),
      })
      if (item.weaponClass) {
        combatRows.push({
          label: 'Weapon class',
          value: item.weaponClass.charAt(0).toUpperCase() + item.weaponClass.slice(1),
        })
      }
    }

    statRows.push(...baseStatRows(item.bonuses))

    if (item.combatBonuses?.critChance) {
      statRows.push({
        label: 'CRIT Rate',
        value: `+${item.combatBonuses.critChance}%`,
        variant: 'bonus',
      })
    }

    if (item.weight > 0) metaRows.push({ label: 'Weight', value: String(item.weight) })
    if (item.stackMax > 1) metaRows.push({ label: 'Stack limit', value: String(item.stackMax) })
  }

  if (rolled) {
    subtitleLines.push(
      `${rolled.rarity.charAt(0).toUpperCase() + rolled.rarity.slice(1)} · Req. base Lv ${rolled.requiredBaseLevel}`,
    )
    for (const affix of rolled.affixes ?? []) {
      const row = rolledGearAffixToRow(affix)
      statRows.push({ ...row, variant: 'roll' })
    }
    if (rolled.effect) {
      if (rolled.effect.kind === 'critChance') {
        effectRows.push({
          label: 'CRIT Rate',
          value: `+${rolled.effect.percent}%`,
          variant: 'effect',
        })
      } else {
        effectRows.push({ ...rolledSpecialEffectToRow(rolled.effect), variant: 'effect' })
      }
    }
    effectRows.push({ label: 'Card slots', value: '0 / 2', variant: 'muted' })
  } else if (cosmeticRarity && isNpcCosmeticRarityItem(itemId)) {
    subtitleLines.push(rarityLabel(cosmeticRarity))
    metaRows.push({
      label: 'Note',
      value: 'Shop preview — buy for random options',
      variant: 'muted',
    })
  }

  const consumable = getConsumableEffect(itemId)
  if (consumable) {
    if (consumable.healHp) {
      effectRows.push({ label: 'Restores HP', value: String(consumable.healHp), variant: 'effect' })
    }
    if (consumable.healSp) {
      effectRows.push({ label: 'Restores SP', value: String(consumable.healSp), variant: 'effect' })
    }
  }

  pushSection(sections, { title: 'Item', rows: infoRows })
  pushSection(sections, { title: 'Combat', rows: combatRows })
  pushSection(sections, { title: 'Stats', rows: statRows })
  pushSection(sections, { title: 'Effects', rows: effectRows })
  pushSection(sections, { title: 'Details', rows: metaRows })

  return {
    name: displayName,
    nameColor:
      rolled ? rarityColor(rolled.rarity) : cosmeticRarity ? rarityColor(cosmeticRarity) : undefined,
    subtitleLines,
    sections,
  }
}
