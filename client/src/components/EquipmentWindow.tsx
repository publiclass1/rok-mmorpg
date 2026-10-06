import type { EquipSlot } from '../game/character/characterState'
import { EQUIPMENT } from '../game/character/equipmentConfig'
import { getItemDisplayName } from '../game/character/itemCatalog'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

const SLOT_ORDER: EquipSlot[] = ['weapon', 'head', 'armor', 'garment', 'boots']

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: 'Weapon',
  head: 'Head',
  armor: 'Armor',
  garment: 'Garment',
  boots: 'Boots',
}

export function EquipmentWindow({ sheet, onClose }: Props) {
  function unequip(slot: EquipSlot) {
    dispatchCharacterAction({ type: 'equip', slot, itemId: null })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal equipment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Equipment</h2>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
        <div className="equip-slots-grid">
          {SLOT_ORDER.map((slot) => {
            const itemId = sheet.equipment[slot]
            const color = itemId ? EQUIPMENT[itemId]?.layerColor ?? 0x4b5563 : 0x1f2937
            return (
              <div key={slot} className="equip-slot-cell">
                <span className="muted small">{SLOT_LABELS[slot]}</span>
                <div
                  className={`inv-slot equip-slot-preview ${itemId ? 'filled' : ''}`}
                  style={{ backgroundColor: itemId ? `#${color.toString(16).padStart(6, '0')}` : undefined }}
                  title={itemId ? getItemDisplayName(itemId) : 'Empty'}
                >
                  {itemId ? getItemDisplayName(itemId).slice(0, 3) : '—'}
                </div>
                {itemId && (
                  <button type="button" className="secondary small-btn" onClick={() => unequip(slot)}>
                    Unequip
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
