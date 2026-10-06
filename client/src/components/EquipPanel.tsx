import type { EquipSlot } from '../game/character/characterState'
import { EQUIPMENT } from '../game/character/equipmentConfig'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
}

const SLOT_ORDER: EquipSlot[] = [
  'headTop',
  'headMiddle',
  'headLower',
  'weapon',
  'armor',
  'offhand',
  'garment',
  'boots',
  'accLeft',
  'accRight',
]

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

export function EquipPanel({ sheet }: Props) {
  function equip(slot: EquipSlot, itemId: string | null) {
    emitGameEvent('characterAction', { type: 'equip', slot, itemId })
  }

  const invEntries = sheet.sessionInventory
    .map((slot, sessionIndex) => ({ slot, sessionIndex }))
    .filter(({ slot }) => EQUIPMENT[slot.itemId])

  return (
    <div className="equip-panel">
      <h3>Equipment</h3>
      <ul className="item-list">
        {SLOT_ORDER.map((slot) => {
          const itemId = sheet.equipment[slot]
          const name = itemId ? EQUIPMENT[itemId]?.name ?? itemId : '—'
          return (
            <li key={slot} className="row spread">
              <span>{SLOT_LABELS[slot]}: {name}</span>
              {itemId && (
                <button type="button" className="secondary" onClick={() => equip(slot, null)}>Unequip</button>
              )}
            </li>
          )
        })}
      </ul>
      <h4>Inventory (session)</h4>
      <ul className="item-list">
        {invEntries.map(({ slot, sessionIndex }) => {
          const def = EQUIPMENT[slot.itemId]
          if (!def) return null
          const label = slot.quantity > 1 ? `${def.name} ×${slot.quantity}` : def.name
          return (
            <li key={`${slot.itemId}-${sessionIndex}`} className="row spread">
              <span>{label}</span>
              <button
                type="button"
                onClick={() =>
                  emitGameEvent('characterAction', {
                    type: 'equip',
                    slot: def.slot,
                    itemId: slot.itemId,
                    sessionInventoryIndex: sessionIndex,
                  })
                }
              >
                Equip
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
