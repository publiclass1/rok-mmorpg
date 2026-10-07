import type { EquipSlot } from '../game/character/characterState'
import { EQUIPMENT } from '../game/character/equipmentConfig'
import { getItemDisplayName, hasItemIcon } from '../game/character/itemCatalog'
import { ItemIcon } from './ItemIcon'
import type { CharacterAppearance } from '../game/character/characterAppearance'
import { CharacterAppearancePreview } from './CharacterAppearancePreview'
import { CharacterEquipPreview } from './CharacterEquipPreview'

export const EQUIP_SLOT_LABELS: Record<EquipSlot, string> = {
  headTop: 'Head (Top)',
  headMiddle: 'Head (Mid)',
  headLower: 'Head (Low)',
  weapon: 'Weapon',
  armor: 'Armor',
  offhand: 'Off-hand',
  garment: 'Garment',
  boots: 'Boots',
  accLeft: 'Acc (L)',
  accRight: 'Acc (R)',
}

export const EQUIP_LEFT_SLOTS: EquipSlot[] = ['headTop', 'headLower', 'weapon', 'garment', 'accLeft']
export const EQUIP_RIGHT_SLOTS: EquipSlot[] = ['headMiddle', 'armor', 'offhand', 'boots', 'accRight']

type SlotCellProps = {
  slot: EquipSlot
  itemId: string | null
  compact?: boolean
  onUnequip?: (slot: EquipSlot) => void
}

function EquipSlotCell({ slot, itemId, compact, onUnequip }: SlotCellProps) {
  const hasIcon = itemId ? hasItemIcon(itemId) : false
  const color = itemId ? EQUIPMENT[itemId]?.layerColor ?? 0x4b5563 : 0x1f2937
  return (
    <div className={`equip-slot-cell${compact ? ' equip-slot-cell--compact' : ''}`}>
      <span className="muted small equip-slot-label">{EQUIP_SLOT_LABELS[slot]}</span>
      <div
        className={`inv-slot equip-slot-preview ${compact ? 'equip-slot-preview--compact' : ''} ${itemId ? 'filled' : ''}${hasIcon ? ' inv-slot--has-icon' : ''}`}
        style={
          itemId && !hasIcon
            ? { backgroundColor: `#${color.toString(16).padStart(6, '0')}` }
            : undefined
        }
        title={itemId ? getItemDisplayName(itemId) : 'Empty'}
      >
        {itemId ? (
          hasIcon ? (
            <ItemIcon itemId={itemId} size={compact ? 28 : 36} alt="" />
          ) : (
            getItemDisplayName(itemId).slice(0, 3)
          )
        ) : (
          '—'
        )}
      </div>
      {itemId && onUnequip && (
        <button type="button" className="secondary small-btn" onClick={() => onUnequip(slot)}>
          Unequip
        </button>
      )}
    </div>
  )
}

type Props = {
  equipment: Record<EquipSlot, string | null>
  appearance?: CharacterAppearance
  compact?: boolean
  centerClassName?: string
  onUnequip?: (slot: EquipSlot) => void
}

export function CharacterEquipReadOnly({ equipment, appearance, compact, centerClassName, onUnequip }: Props) {
  return (
    <div className={`equipment-ro-layout${compact ? ' equipment-ro-layout--compact' : ''}`}>
      <div className="equipment-ro-col equipment-ro-col--left">
        {EQUIP_LEFT_SLOTS.map((slot) => (
          <EquipSlotCell
            key={slot}
            slot={slot}
            itemId={equipment[slot]}
            compact={compact}
            onUnequip={onUnequip}
          />
        ))}
      </div>
      <div
        className={`equipment-ro-center char-select-character-center${centerClassName ? ` ${centerClassName}` : ''}`}
      >
        {appearance ? (
          <CharacterAppearancePreview appearance={appearance} size="lg" />
        ) : (
          <CharacterEquipPreview equipment={equipment} />
        )}
      </div>
      <div className="equipment-ro-col equipment-ro-col--right">
        {EQUIP_RIGHT_SLOTS.map((slot) => (
          <EquipSlotCell
            key={slot}
            slot={slot}
            itemId={equipment[slot]}
            compact={compact}
            onUnequip={onUnequip}
          />
        ))}
      </div>
    </div>
  )
}
