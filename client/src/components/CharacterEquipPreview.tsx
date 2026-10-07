import type { EquipSlot } from '../game/character/characterState'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import { getEquipColor, getItemIconUrl } from '../game/character/itemCatalog'
import { CharacterAppearancePreview } from './CharacterAppearancePreview'

function colorHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

type PreviewLayerProps = {
  className: string
  itemId: string | null | undefined
}

function PreviewLayer({ className, itemId }: PreviewLayerProps) {
  if (!itemId) return null
  const src = getItemIconUrl(itemId)
  if (src) {
    return (
      <div className={className}>
        <img src={src} alt="" className="character-equip-preview__art" draggable={false} />
      </div>
    )
  }
  return <div className={className} style={{ backgroundColor: colorHex(getEquipColor(itemId)) }} />
}

type Props = {
  equipment: Record<EquipSlot, string | null>
  appearance?: CharacterAppearance
  jobId?: string
  size?: 'sm' | 'lg'
}

export function CharacterEquipPreview({
  equipment,
  appearance = DEFAULT_CHARACTER_APPEARANCE,
  jobId,
  size = 'lg',
}: Props) {
  return (
    <div
      className={`character-equip-preview character-equip-preview__stack${size === 'lg' ? ' character-equip-preview--lg' : ''}`}
      aria-hidden
    >
      <div className="character-equip-preview__figure">
        <CharacterAppearancePreview appearance={appearance} jobId={jobId} size="sm" />
        <div className="character-equip-preview__overlays">
          <PreviewLayer className="character-equip-preview__head-top" itemId={equipment.headTop} />
          <PreviewLayer className="character-equip-preview__head-middle" itemId={equipment.headMiddle} />
          <PreviewLayer className="character-equip-preview__head-lower" itemId={equipment.headLower} />
        </div>
      </div>
    </div>
  )
}
