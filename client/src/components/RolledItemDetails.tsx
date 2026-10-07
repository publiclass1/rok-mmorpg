import { getRolledItemOrNull } from '../game/character/itemCatalog'
import { rarityColor } from '../game/items/rolledItem'

type Props = {
  itemId: string
}

export function RolledItemDetails({ itemId }: Props) {
  const rolled = getRolledItemOrNull(itemId)
  if (!rolled) return null

  const statLines = Object.entries(rolled.stats)
    .filter(([, v]) => v != null && v > 0)
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)

  return (
    <div className="rolled-item-details small">
      <p style={{ color: rarityColor(rolled.rarity), margin: '0.25rem 0' }}>
        {rolled.rarity.charAt(0).toUpperCase() + rolled.rarity.slice(1)} · Lv {rolled.requiredBaseLevel}
      </p>
      {statLines.length > 0 && <p className="muted" style={{ margin: 0 }}>{statLines.join(' · ')}</p>}
      <p className="muted" style={{ margin: 0 }}>
        {rolled.effect.kind === 'critChance'
          ? `+${rolled.effect.percent}% critical hit chance`
          : `+${rolled.effect.percent}% ${rolled.effect.kind} damage`}
      </p>
      <p className="muted" style={{ margin: 0 }}>Card slots: [ ] [ ]</p>
    </div>
  )
}
