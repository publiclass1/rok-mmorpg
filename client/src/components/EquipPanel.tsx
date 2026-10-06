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

  const invItems = sheet.sessionInventory.filter((id) => EQUIPMENT[id])

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
        {invItems.map((itemId) => {
          const def = EQUIPMENT[itemId]
          if (!def) return null
          return (
            <li key={itemId} className="row spread">
              <span>{def.name}</span>
              <button type="button" onClick={() => equip(def.slot, itemId)}>Equip</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
