import { useEffect, useMemo, useState } from 'react'
import { EQUIPMENT } from '../game/character/equipmentConfig'
import { getEquipColor, getItemDisplayName, isEquippable } from '../game/character/itemCatalog'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
import { supabase } from '../lib/supabase'

type Props = {
  characterId: string
  sheet: CharacterSheetPayload
  onClose: () => void
}

type InvCell = {
  key: string
  itemId: string
  quantity: number
  source: 'session' | 'db'
}

export function InventoryWindow({ characterId, sheet, onClose }: Props) {
  const [dbRows, setDbRows] = useState<Array<{ item_id: string; quantity: number }>>([])

  useEffect(() => {
    void supabase
      .from('character_inventory')
      .select('item_id, quantity')
      .eq('character_id', characterId)
      .then(({ data }) => setDbRows(data ?? []))
  }, [characterId])

  const cells = useMemo(() => {
    const list: InvCell[] = []
    sheet.sessionInventory.forEach((itemId, i) => {
      list.push({ key: `s-${itemId}-${i}`, itemId, quantity: 1, source: 'session' })
    })
    for (const row of dbRows) {
      list.push({
        key: `db-${row.item_id}`,
        itemId: row.item_id,
        quantity: row.quantity,
        source: 'db',
      })
    }
    return list
  }, [sheet.sessionInventory, dbRows])

  function onDoubleClick(cell: InvCell) {
    const def = EQUIPMENT[cell.itemId]
    if (!def) {
      emitGameEvent('status', `Cannot equip ${getItemDisplayName(cell.itemId)}.`)
      return
    }
    dispatchCharacterAction({ type: 'equip', slot: def.slot, itemId: cell.itemId })
  }

  function isEquipped(itemId: string) {
    return Object.values(sheet.equipment).includes(itemId)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal inventory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Inventory</h2>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
        <p className="muted small">Double-click gear to equip. Session items + account inventory.</p>
        <div className="inv-grid">
          {cells.map((cell) => {
            const equippable = isEquippable(cell.itemId)
            const equipped = isEquipped(cell.itemId)
            const color = getEquipColor(cell.itemId)
            return (
              <button
                key={cell.key}
                type="button"
                className={`inv-slot ${equipped ? 'equipped' : ''} ${equippable ? 'equippable' : ''}`}
                style={
                  equippable
                    ? { backgroundColor: `#${color.toString(16).padStart(6, '0')}` }
                    : undefined
                }
                title={`${getItemDisplayName(cell.itemId)}${cell.quantity > 1 ? ` ×${cell.quantity}` : ''}`}
                onDoubleClick={() => onDoubleClick(cell)}
              >
                <span className="inv-slot-label">{getItemDisplayName(cell.itemId).slice(0, 4)}</span>
                {cell.quantity > 1 && <span className="inv-slot-qty">{cell.quantity}</span>}
                {equipped && <span className="inv-equipped-badge">E</span>}
              </button>
            )
          })}
          {cells.length === 0 && <p className="muted">No items.</p>}
        </div>
      </div>
    </div>
  )
}
