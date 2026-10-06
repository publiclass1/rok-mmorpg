import { useMemo, useState } from 'react'
import { vendorManage } from '../lib/api'
import { getItemDisplayName } from '../game/character/itemCatalog'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
import { AnimatedModal } from './motion/AnimatedModal'

type DraftRow = { itemId: string; quantity: number; price: string }

type Props = {
  characterId: string
  sheet: CharacterSheetPayload
  mapId: string
  x: number
  y: number
  title: string
  onClose: () => void
  onOpened: () => void
  onStallClosed: () => void
  onMessage: (msg: string) => void
}

export function VendorSetupModal({
  characterId,
  sheet,
  mapId,
  x,
  y,
  title: initialTitle,
  onClose,
  onOpened,
  onStallClosed,
  onMessage,
}: Props) {
  const [stallTitle, setStallTitle] = useState(initialTitle)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [busy, setBusy] = useState(false)

  const bagOptions = useMemo(
    () =>
      sheet.sessionInventory
        .filter((s) => s.quantity > 0)
        .map((s) => ({ itemId: s.itemId, max: s.quantity })),
    [sheet.sessionInventory],
  )

  function addRow() {
    const first = bagOptions[0]
    if (!first) return
    setRows((prev) => [...prev, { itemId: first.itemId, quantity: 1, price: '100' }])
  }

  async function openStall() {
    setBusy(true)
    try {
      const listings = rows.map((r) => ({
        itemId: r.itemId,
        quantity: Math.floor(Number(r.quantity)),
        price: Math.floor(Number(r.price)),
      }))
      await vendorManage({
        action: 'set_listings',
        characterId,
        listings,
      })
      await vendorManage({
        action: 'open',
        characterId,
        title: stallTitle,
        mapId,
        x,
        y,
      })
      emitGameEvent('socialPresence', {
        isVending: true,
        stallTitle: stallTitle,
      })
      emitGameEvent('vendorPosSync', { mapId, x, y })
      onOpened()
      onClose()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not open stall')
    } finally {
      setBusy(false)
    }
  }

  async function closeStall() {
    setBusy(true)
    try {
      await vendorManage({ action: 'close', characterId })
      onStallClosed()
      onClose()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not close stall')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatedModal onClose={onClose}>
      <div className="modal-panel vendor-setup">
        <h2>Vending</h2>
        <label className="small">
          Shop title
          <input value={stallTitle} onChange={(e) => setStallTitle(e.target.value)} maxLength={40} />
        </label>
        <div className="vendor-rows">
          {rows.map((row, i) => (
            <div key={i} className="row gap spread vendor-row">
              <select
                value={row.itemId}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, j) => (j === i ? { ...r, itemId: e.target.value } : r)))
                }
              >
                {bagOptions.map((o) => (
                  <option key={o.itemId} value={o.itemId}>
                    {getItemDisplayName(o.itemId)} (×{o.max})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, j) => (j === i ? { ...r, quantity: Number(e.target.value) } : r)))
                }
              />
              <input
                type="number"
                min={1}
                value={row.price}
                onChange={(e) =>
                  setRows((prev) => prev.map((r, j) => (j === i ? { ...r, price: e.target.value } : r)))
                }
              />
            </div>
          ))}
        </div>
        <button type="button" className="secondary" onClick={addRow} disabled={bagOptions.length === 0}>
          Add item
        </button>
        <div className="row gap">
          <button type="button" disabled={busy} onClick={() => void openStall()}>
            Open stall
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => void closeStall()}>
            Close stall
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
