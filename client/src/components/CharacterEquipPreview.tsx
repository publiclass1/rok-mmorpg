import type { EquipSlot } from '../game/character/characterState'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import { getEquipColor } from '../game/character/itemCatalog'
import { CharacterAppearancePreview } from './CharacterAppearancePreview'

function colorHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

type PreviewLayerProps = {
  className: string
  itemId: string | null | undefined
}

/** Worn-equipment tint blocks (same idea as the world avatar overlays). */
function PreviewLayer({ className, itemId }: PreviewLayerProps) {
  if (!itemId) return null
  return <div className={className} style={{ backgroundColor: colorHex(getEquipColor(itemId)) }} />
}

type Props = {
  equipment: Record<EquipSlot, string | null>
  appearance?: CharacterAppearance
  size?: 'sm' | 'lg'
}

export function CharacterEquipPreview({
  equipment,
  appearance = DEFAULT_CHARACTER_APPEARANCE,
  size = 'lg',
}: Props) {
  const weaponId = equipment.weapon
  const armorId = equipment.armor
  const offhandId = equipment.offhand
  const garmentId = equipment.garment
  const headTopId = equipment.headTop
  const headMiddleId = equipment.headMiddle
  const headLowerId = equipment.headLower

  return (
    <div
      className={`character-equip-preview character-equip-preview__stack${size === 'lg' ? ' character-equip-preview--lg' : ''}`}
      aria-hidden
    >
      <div className="character-equip-preview__figure">
        <CharacterAppearancePreview appearance={appearance} size="sm" />
        <div className="character-equip-preview__overlays">
        <PreviewLayer className="character-equip-preview__garment" itemId={garmentId} />
        <PreviewLayer className="character-equip-preview__armor" itemId={armorId} />
        <PreviewLayer className="character-equip-preview__head-top" itemId={headTopId} />
        <PreviewLayer className="character-equip-preview__head-middle" itemId={headMiddleId} />
        <PreviewLayer className="character-equip-preview__head-lower" itemId={headLowerId} />
        <PreviewLayer className="character-equip-preview__offhand" itemId={offhandId} />
        <PreviewLayer className="character-equip-preview__weapon" itemId={weaponId} />
        </div>
      </div>
    </div>
  )
}
