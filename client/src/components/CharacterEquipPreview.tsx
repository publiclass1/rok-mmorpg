import type { EquipSlot } from '../game/character/characterState'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../game/character/characterAppearance'
import { CharacterFieldPreview } from './CharacterFieldPreview'

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
        <CharacterFieldPreview
          appearance={appearance}
          equipment={equipment}
          jobId={jobId}
          size={size === 'lg' ? 'lg' : 'sm'}
        />
      </div>
    </div>
  )
}
