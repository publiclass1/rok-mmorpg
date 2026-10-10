import type { CSSProperties, ReactNode } from 'react'
import { hasItemIcon, isWeaponOrArmorItem } from '../game/character/itemCatalog'
import { isRolledItemId } from '../game/items/rolledItem'
import { getItemRarity, rarityColor, rarityTier } from '../game/items/itemRarity'
import { ItemIcon } from './ItemIcon'

type Size = 'md' | 'lg' | 'compact'

type Props = {
  itemId: string
  size?: Size
  className?: string
  fallbackLabel?: string
  children?: ReactNode
}

const ICON_PX: Record<Size, number> = {
  compact: 40,
  md: 48,
  lg: 52,
}

export function itemIconGlowClassName(itemId: string): string {
  if (!isWeaponOrArmorItem(itemId) || !isRolledItemId(itemId)) return ''
  const rarity = getItemRarity(itemId)
  const tier = rarity ? rarityTier(rarity) : 0
  const classes = ['item-icon--drop-glow']
  if (tier >= 4) classes.push('item-icon--drop-glow-strong')
  return classes.join(' ')
}

export function itemSlotDisplayClassName(itemId: string, size: Size = 'md'): string {
  const classes = ['item-slot-display', `item-slot-display--${size}`]
  if (isWeaponOrArmorItem(itemId) && getItemRarity(itemId)) {
    classes.push('item-slot-display--rarity')
  }
  return classes.join(' ')
}

export function itemSlotDisplayStyle(itemId: string): CSSProperties | undefined {
  if (!isWeaponOrArmorItem(itemId)) return undefined
  const rarity = getItemRarity(itemId)
  if (!rarity) return undefined
  const accent = rarityColor(rarity)
  const tier = rarityTier(rarity)
  return {
    ['--item-rarity-accent' as string]: accent,
    ['--item-rarity-glow-speed' as string]: `${Math.max(1.4, 2.2 - tier * 0.12)}s`,
  }
}

export function ItemSlotDisplay({ itemId, size = 'md', className, fallbackLabel, children }: Props) {
  const showIcon = hasItemIcon(itemId)
  const classes = [itemSlotDisplayClassName(itemId, size), className].filter(Boolean).join(' ')

  const iconGlow = itemIconGlowClassName(itemId)

  return (
    <div className={classes} style={itemSlotDisplayStyle(itemId)}>
      {children ??
        (showIcon ? (
          <ItemIcon
            itemId={itemId}
            size={ICON_PX[size]}
            alt=""
            className={iconGlow || undefined}
          />
        ) : (
          <span className="item-slot-display__fallback">{fallbackLabel ?? '?'}</span>
        ))}
    </div>
  )
}
