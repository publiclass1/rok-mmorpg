import { useEffect, useMemo, useState } from 'react'
import { getEquipmentDefinition } from '../game/character/equipmentConfig'
import { getItemDisplayName, isConsumable, isEquippable } from '../game/character/itemCatalog'
import { ItemHoverTooltip } from './ItemHoverTooltip'
import { ItemSlotDisplay } from './ItemSlotDisplay'
import { RolledItemDetails } from './RolledItemDetails'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { writeSkillBarDrag } from '../game/character/skillBarDrag'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
import { apiFetch } from '../lib/http'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

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
  sessionIndex?: number
}

export function InventoryWindow({ characterId, sheet, onClose }: Props) {
  const [dbRows, setDbRows] = useState<Array<{ item_id: string; quantity: number }>>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  useEffect(() => {
    void apiFetch<{ inventory: Array<{ item_id: string; quantity: number }> }>(
      `/api/characters/${characterId}/inventory`,
    ).then(({ inventory }) => setDbRows(inventory ?? []))
  }, [characterId])

  const cells = useMemo(() => {
    const list: InvCell[] = []
    sheet.sessionInventory.forEach((slot, i) => {
      list.push({
        key: `s-${slot.itemId}-${i}`,
        itemId: slot.itemId,
        quantity: slot.quantity,
        source: 'session',
        sessionIndex: i,
      })
    })
    for (const row of dbRows) {
      if (!row.item_id) continue
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
    if (cell.source !== 'session') {
      emitGameEvent('status', 'Cannot use items from account storage yet.')
      return
    }
    if (isConsumable(cell.itemId)) {
      dispatchCharacterAction({
        type: 'useConsumable',
        sessionInventoryIndex: cell.sessionIndex ?? 0,
      })
      return
    }
    const def = getEquipmentDefinition(cell.itemId)
    if (!def) {
      emitGameEvent('status', `Cannot use ${getItemDisplayName(cell.itemId)}.`)
      return
    }
    dispatchCharacterAction({
      type: 'equip',
      slot: def.slot,
      itemId: cell.itemId,
      sessionInventoryIndex: cell.sessionIndex,
    })
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal inventory-modal">
        <ModalHeader title="Inventory" onClose={onClose} />
        <ModalScrollBody>
        <p className="muted small">
          Double-click session items to use or equip. Drag consumables to the skill bar. Account storage is
          view-only.
        </p>
        <div className="inv-grid">
          {cells.map((cell) => {
            const equippable = isEquippable(cell.itemId)
            const consumable = isConsumable(cell.itemId)
            const canDragToBar = consumable && cell.source === 'session'
            return (
              <ItemHoverTooltip key={cell.key} itemId={cell.itemId} quantity={cell.quantity}>
                <button
                  type="button"
                  className={`inv-slot ${equippable ? 'equippable' : ''}${canDragToBar ? ' inv-slot--draggable' : ''}`}
                  draggable={canDragToBar}
                  onDragStart={(e) => {
                    if (!canDragToBar) return
                    writeSkillBarDrag(e.dataTransfer, { source: 'inventory', itemId: cell.itemId })
                  }}
                  onClick={() => setSelectedItemId(cell.itemId)}
                  onDoubleClick={() => onDoubleClick(cell)}
                >
                  <ItemSlotDisplay
                    itemId={cell.itemId}
                    size="lg"
                    fallbackLabel={getItemDisplayName(cell.itemId).slice(0, 4)}
                  />
                  {cell.quantity > 1 && <span className="inv-slot-qty">{cell.quantity}</span>}
                </button>
              </ItemHoverTooltip>
            )
          })}
          {cells.length === 0 && <p className="muted">No items.</p>}
        </div>
        {selectedItemId && <RolledItemDetails itemId={selectedItemId} />}
        </ModalScrollBody>
    </AnimatedModal>
  )
}
