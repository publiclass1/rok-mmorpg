import type { EquipSlot } from '../game/character/characterState'
import { EQUIPMENT } from '../game/character/equipmentConfig'
import { getItemDisplayName } from '../game/character/itemCatalog'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'
import { CharacterEquipPreview } from './CharacterEquipPreview'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

const SLOT_LABELS: Record<EquipSlot, string> = {
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

const LEFT_SLOTS: EquipSlot[] = ['headTop', 'headLower', 'weapon', 'garment', 'accLeft']
const RIGHT_SLOTS: EquipSlot[] = ['headMiddle', 'armor', 'offhand', 'boots', 'accRight']

type SlotCellProps = {
  slot: EquipSlot
  itemId: string | null
  onUnequip: (slot: EquipSlot) => void
}

function EquipSlotCell({ slot, itemId, onUnequip }: SlotCellProps) {
  const color = itemId ? EQUIPMENT[itemId]?.layerColor ?? 0x4b5563 : 0x1f2937
  return (
    <div className="equip-slot-cell">
      <span className="muted small">{SLOT_LABELS[slot]}</span>
      <div
        className={`inv-slot equip-slot-preview ${itemId ? 'filled' : ''}`}
        style={{ backgroundColor: itemId ? `#${color.toString(16).padStart(6, '0')}` : undefined }}
        title={itemId ? getItemDisplayName(itemId) : 'Empty'}
      >
        {itemId ? getItemDisplayName(itemId).slice(0, 3) : '—'}
      </div>
      {itemId && (
        <button type="button" className="secondary small-btn" onClick={() => onUnequip(slot)}>
          Unequip
        </button>
      )}
    </div>
  )
}

export function EquipmentWindow({ sheet, onClose }: Props) {
  function unequip(slot: EquipSlot) {
    dispatchCharacterAction({ type: 'equip', slot, itemId: null })
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal equipment-modal">
        <div className="row spread modal-drag-handle">
          <h2 style={{ margin: 0 }}>Equipment</h2>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
        <div className="equipment-ro-layout">
          <div className="equipment-ro-col equipment-ro-col--left">
            {LEFT_SLOTS.map((slot) => (
              <EquipSlotCell
                key={slot}
                slot={slot}
                itemId={sheet.equipment[slot]}
                onUnequip={unequip}
              />
            ))}
          </div>
          <div className="equipment-ro-center">
            <CharacterEquipPreview equipment={sheet.equipment} />
          </div>
          <div className="equipment-ro-col equipment-ro-col--right">
            {RIGHT_SLOTS.map((slot) => (
              <EquipSlotCell
                key={slot}
                slot={slot}
                itemId={sheet.equipment[slot]}
                onUnequip={unequip}
              />
            ))}
          </div>
        </div>
    </AnimatedModal>
  )
}
