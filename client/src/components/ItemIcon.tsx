import { getItemIconUrl } from '../game/character/itemCatalog'

type Props = {
  itemId: string
  size?: number
  className?: string
  alt?: string
}

export function ItemIcon({ itemId, size = 32, className, alt = '' }: Props) {
  const src = getItemIconUrl(itemId)
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className ? `item-icon ${className}` : 'item-icon'}
      draggable={false}
    />
  )
}
