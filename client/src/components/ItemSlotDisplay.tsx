import type { CSSProperties, ReactNode } from 'react'
import { hasItemIcon, isWeaponOrArmorItem } from '../game/character/itemCatalog'
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
  md: 56,
  lg: 72,
}

/** Steady icon/slot emphasis by rarity tier (0 = common … 6 = artifact). */
const RARITY_GLOW_BY_TIER = [
  { iconInner: 38, iconOuter: 22, blurInner: 5, blurOuter: 9, ring: 28, fill: 8 },
  { iconInner: 48, iconOuter: 30, blurInner: 6, blurOuter: 11, ring: 34, fill: 10 },
  { iconInner: 58, iconOuter: 38, blurInner: 7, blurOuter: 13, ring: 42, fill: 14 },
  { iconInner: 68, iconOuter: 46, blurInner: 9, blurOuter: 16, ring: 50, fill: 18 },
  { iconInner: 78, iconOuter: 54, blurInner: 11, blurOuter: 19, ring: 58, fill: 22 },
  { iconInner: 88, iconOuter: 62, blurInner: 13, blurOuter: 22, ring: 66, fill: 26 },
  { iconInner: 96, iconOuter: 72, blurInner: 15, blurOuter: 26, ring: 75, fill: 32 },
] as const

export function itemIconGlowClassName(itemId: string): string {
  if (!isWeaponOrArmorItem(itemId)) return ''
  const rarity = getItemRarity(itemId)
  if (!rarity) return ''
  return 'item-icon--drop-glow'
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
  const glow = RARITY_GLOW_BY_TIER[Math.min(tier, RARITY_GLOW_BY_TIER.length - 1)]
  return {
    ['--item-rarity-accent' as string]: accent,
    ['--item-rarity-glow-alpha' as string]: `${glow.iconInner}%`,
    ['--item-rarity-glow-alpha-outer' as string]: `${glow.iconOuter}%`,
    ['--item-rarity-glow-blur' as string]: `${glow.blurInner}px`,
    ['--item-rarity-glow-blur-outer' as string]: `${glow.blurOuter}px`,
    ['--item-rarity-ring-alpha' as string]: `${glow.ring}%`,
    ['--item-rarity-fill-alpha' as string]: `${glow.fill}%`,
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
