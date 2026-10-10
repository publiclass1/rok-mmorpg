import { useEffect, useMemo, useState } from 'react'
import { toCharacterSheetPayload } from '../game/character/characterSheet'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { formatEquipRequirements, meetsEquipRequirements } from '../game/character/equipRequirements'
import { getItemDisplayName, isEquippable } from '../game/character/itemCatalog'
import { ItemHoverTooltip } from './ItemHoverTooltip'
import { ItemIcon } from './ItemIcon'
import {
  addToCart,
  cartEntries,
  cartTotal,
  clearCart,
  pricesFromStock,
  removeFromCart,
  type ShopCart,
} from '../game/character/shopCart'
import { resolveNpcSellUnitPrice } from '../game/character/npcSellPrice'
import { shopStockFromNpcConfig } from '../game/character/npcServices'
import { emitGameEvent, sessionSyncPayload } from '../game/events'
import type { CharacterSheetPayload } from '../game/events'
import type { CharacterRow, NpcRow } from '../types/database'
import { loadCharacterSession } from '../lib/characterProgress'
import { npcShopSell } from '../lib/api'
import { apiFetch } from '../lib/http'
import { spendCharacterZeny } from '../lib/zeny'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalCloseButton } from './motion/ModalCloseButton'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  character: CharacterRow
  npc: NpcRow
  sheet: CharacterSheetPayload
  initialTab?: 'buy' | 'sell'
  onClose: () => void
  onCharacterUpdated: (character: CharacterRow) => void
}

type ShopTab = 'buy' | 'sell'

function formatRowLabel(name: string, qtyLabel: string, price: number): string {
  return `${name} (${qtyLabel}) — ${price} z`
}

function formatSellInventoryRowLabel(name: string, ownedQty: number, unitPrice: number): string {
  if (unitPrice <= 0) return `${name} (${ownedQty}) — No sell value`
  return `${name} (${ownedQty}) — ${unitPrice} z`
}

type CatalogRow = {
  itemId: string
  price: number
  qtyLabel: string
  maxAdd?: number
  requirementHint?: string
  unmetRequirements?: boolean
}

function ShopCatalogPane({
  title,
  rows,
  emptyMessage,
  onAdd,
}: {
  title: string
  rows: CatalogRow[]
  emptyMessage: string
  onAdd: (itemId: string) => void
}) {
  return (
    <section className="shop-pane shop-pane--catalog">
      <h3 className="shop-pane__title">{title}</h3>
      <div className="shop-pane__list">
        {rows.length === 0 ? (
          <p className="muted small shop-pane__empty">{emptyMessage}</p>
        ) : (
          rows.map((row) => {
            const atMax = row.maxAdd !== undefined && row.maxAdd <= 0
            return (
              <ItemHoverTooltip key={row.itemId} itemId={row.itemId}>
                <button
                  type="button"
                  className={`shop-row${row.unmetRequirements ? ' shop-row--unmet' : ''}`}
                  disabled={atMax}
                  onClick={() => onAdd(row.itemId)}
                >
                  <ItemIcon itemId={row.itemId} size={28} className="shop-row__icon" alt="" />
                  <span className="shop-row__name">
                    {formatRowLabel(getItemDisplayName(row.itemId), row.qtyLabel, row.price)}
                  </span>
                  {row.requirementHint ? (
                    <span className="shop-row__req muted small">{row.requirementHint}</span>
                  ) : null}
                </button>
              </ItemHoverTooltip>
            )
          })
        )}
      </div>
    </section>
  )
}

function ShopCartPane({
  title,
  cart,
  priceByItemId,
  onRemove,
}: {
  title: string
  cart: ShopCart
  priceByItemId: Record<string, number>
  onRemove: (itemId: string) => void
}) {
  const entries = cartEntries(cart)
  const total = cartTotal(cart, priceByItemId)

  return (
    <section className="shop-pane shop-pane--cart">
      <h3 className="shop-pane__title">{title}</h3>
      <div className="shop-pane__list">
        {entries.length === 0 ? (
          <p className="muted small shop-pane__empty">Click items on the left to add them here.</p>
        ) : (
          entries.map(({ itemId, quantity }) => {
            const unit = priceByItemId[itemId] ?? 0
            return (
              <ItemHoverTooltip key={itemId} itemId={itemId} quantity={quantity}>
                <button
                  type="button"
                  className="shop-row shop-row--cart"
                  onClick={() => onRemove(itemId)}
                  aria-label="Click to remove one"
                >
                  <ItemIcon itemId={itemId} size={28} className="shop-row__icon" alt="" />
                  <span className="shop-row__name">{getItemDisplayName(itemId)}</span>
                  <span className="shop-row__qty">×{quantity}</span>
                  <span className="shop-row__price">{unit * quantity} z</span>
                </button>
              </ItemHoverTooltip>
            )
          })
        )}
      </div>
      <div className="shop-pane__total">
        Total: <strong>{total}</strong> z
      </div>
    </section>
  )
}

export function ShopModal({
  character,
  npc,
  sheet,
  initialTab,
  onClose,
  onCharacterUpdated,
}: Props) {
  const stock = shopStockFromNpcConfig(npc.config)
  const buyPrices = useMemo(() => pricesFromStock(stock), [stock])

  const hasBuy = stock.length > 0
  const hasSell = true
  const [activeTab, setActiveTab] = useState<ShopTab>(() => {
    const desired = initialTab ?? (hasBuy ? 'buy' : 'sell')
    if (desired === 'buy' && !hasBuy) return 'sell'
    if (desired === 'sell' && !hasSell) return 'buy'
    return desired
  })
  const [buyCart, setBuyCart] = useState<ShopCart>({})
  const [sellCart, setSellCart] = useState<ShopCart>({})
  const [busy, setBusy] = useState(false)

  const buyTotal = cartTotal(buyCart, buyPrices)

  const equipContext = useMemo(
    () => ({ baseLevel: sheet.baseLevel, jobId: sheet.jobId }),
    [sheet.baseLevel, sheet.jobId],
  )

  const buyCatalogRows: CatalogRow[] = stock.map((row) => {
    const requirementHint =
      isEquippable(row.itemId) ? formatEquipRequirements(row.itemId) ?? undefined : undefined
    const unmetRequirements =
      requirementHint != null && !meetsEquipRequirements(equipContext, row.itemId)
    return {
      itemId: row.itemId,
      price: row.price,
      qtyLabel: '∞',
      requirementHint,
      unmetRequirements,
    }
  })

  const [dbInventory, setDbInventory] = useState<Array<{ item_id: string; quantity: number }>>([])

  useEffect(() => {
    void apiFetch<{ inventory: Array<{ item_id: string; quantity: number }> }>(
      `/api/characters/${character.id}/inventory`,
    ).then(({ inventory }) => setDbInventory(inventory ?? []))
  }, [character.id])

  const ownedByItemId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const slot of sheet.sessionInventory) {
      if (!slot.itemId || slot.quantity <= 0) continue
      map[slot.itemId] = (map[slot.itemId] ?? 0) + slot.quantity
    }
    for (const row of dbInventory) {
      if (!row.item_id || row.quantity <= 0) continue
      map[row.item_id] = (map[row.item_id] ?? 0) + row.quantity
    }
    return map
  }, [sheet.sessionInventory, dbInventory])

  const sellUnitPrice = (itemId: string) => resolveNpcSellUnitPrice(itemId)

  const sellPriceByItemId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const itemId of Object.keys(ownedByItemId)) {
      map[itemId] = sellUnitPrice(itemId)
    }
    for (const { itemId } of cartEntries(sellCart)) {
      map[itemId] = sellUnitPrice(itemId)
    }
    return map
  }, [ownedByItemId, sellCart])

  const sellTotal = cartTotal(sellCart, sellPriceByItemId)

  const sellInventoryRows = Object.entries(ownedByItemId)
    .filter(([, ownedQty]) => ownedQty > 0)
    .map(([itemId, ownedQty]) => {
      const unitPrice = sellUnitPrice(itemId)
      const inCartQty = sellCart[itemId] ?? 0
      return {
        itemId,
        ownedQty,
        unitPrice,
        inCartQty,
        maxAdd: ownedQty - inCartQty,
      }
    })
    .sort((a, b) => a.itemId.localeCompare(b.itemId))

  const sellCartValid = cartEntries(sellCart).every(({ itemId, quantity }) => {
    if (quantity > (ownedByItemId[itemId] ?? 0)) return false
    return sellUnitPrice(itemId) > 0
  })

  async function adjustZeny(delta: number): Promise<boolean> {
    const nextZeny = await spendCharacterZeny(character.id, delta)
    if (nextZeny == null) return false
    onCharacterUpdated({ ...character, zeny: nextZeny })
    return true
  }

  async function confirmBuy() {
    const entries = cartEntries(buyCart)
    if (entries.length === 0) return
    if (buyTotal > character.zeny) {
      emitGameEvent('status', 'Not enough zeny.')
      return
    }
    setBusy(true)
    try {
      const ok = await adjustZeny(-buyTotal)
      if (!ok) {
        emitGameEvent('status', 'Could not deduct zeny.')
        return
      }
      for (const { itemId, quantity } of entries) {
        dispatchCharacterAction({ type: 'shopAddItems', itemId, quantity })
      }
      setBuyCart(clearCart())
    } finally {
      setBusy(false)
    }
  }

  async function confirmSell() {
    const entries = cartEntries(sellCart)
    if (entries.length === 0) return
    if (!sellCartValid) {
      emitGameEvent('status', 'Not enough items to sell.')
      return
    }
    setBusy(true)
    try {
      const result = await npcShopSell({
        characterId: character.id,
        npcId: npc.id,
        lines: entries,
      })
      onCharacterUpdated({ ...character, zeny: result.zeny })
      const loaded = await loadCharacterSession(character.id)
      emitGameEvent('sessionSync', sessionSyncPayload(loaded, { persist: false }))
      emitGameEvent('characterSheet', toCharacterSheetPayload(loaded))
      setSellCart(clearCart())
      const { inventory } = await apiFetch<{ inventory: Array<{ item_id: string; quantity: number }> }>(
        `/api/characters/${character.id}/inventory`,
      )
      setDbInventory(inventory ?? [])
      emitGameEvent('status', 'Sale complete.')
    } catch (err) {
      emitGameEvent('status', err instanceof Error ? err.message : 'Sale failed.')
    } finally {
      setBusy(false)
    }
  }

  function handleAddBuy(itemId: string) {
    setBuyCart((c) => addToCart(c, itemId))
  }

  type SellDragPrompt = { mode: 'add' | 'putBack'; itemId: string; maxQty: number }
  const [sellDragPrompt, setSellDragPrompt] = useState<SellDragPrompt | null>(null)
  const [sellDragQty, setSellDragQty] = useState<number>(1)

  function confirmSellDragPrompt() {
    if (!sellDragPrompt) return
    const qty = Math.floor(sellDragQty)
    if (!Number.isFinite(qty) || qty < 1) return

    setSellCart((cart) => {
      const current = cart[sellDragPrompt.itemId] ?? 0
      const ownedQty = ownedByItemId[sellDragPrompt.itemId] ?? 0
      if (sellDragPrompt.mode === 'add') {
        const max = Math.max(0, ownedQty - current)
        const toAdd = Math.min(qty, max)
        if (toAdd <= 0) return cart
        return { ...cart, [sellDragPrompt.itemId]: current + toAdd }
      } else {
        const toRemove = Math.min(qty, current)
        if (toRemove <= 0) return cart
        const nextQty = current - toRemove
        if (nextQty <= 0) {
          const next = { ...cart }
          delete next[sellDragPrompt.itemId]
          return next
        }
        return { ...cart, [sellDragPrompt.itemId]: nextQty }
      }
    })

    setSellDragPrompt(null)
  }

  function handleSellAddSingle(itemId: string) {
    if (sellUnitPrice(itemId) <= 0) return
    const ownedQty = ownedByItemId[itemId] ?? 0
    if (ownedQty <= 0) return
    const inCartQty = sellCart[itemId] ?? 0
    const maxAdd = ownedQty - inCartQty
    if (maxAdd <= 0) return
    setSellCart((c) => addToCart(c, itemId, ownedQty))
  }

  function handleSellAddAll(itemId: string) {
    if (sellUnitPrice(itemId) <= 0) return
    const ownedQty = ownedByItemId[itemId] ?? 0
    if (ownedQty <= 0) return
    setSellCart((c) => ({ ...c, [itemId]: ownedQty }))
  }

  const SELL_DRAG_MIME = 'application/x-browser-ro-shop-sell'

  type SellDragPayload =
    | { source: 'inventory'; itemId: string }
    | { source: 'cart'; itemId: string }

  function writeSellDragPayload(dataTransfer: DataTransfer, payload: SellDragPayload) {
    const json = JSON.stringify(payload)
    dataTransfer.setData(SELL_DRAG_MIME, json)
    dataTransfer.setData('text/plain', json)
    dataTransfer.effectAllowed = 'copyMove'
  }

  function readSellDragPayload(dataTransfer: DataTransfer): SellDragPayload | null {
    const custom = dataTransfer.getData(SELL_DRAG_MIME)
    const raw = custom || dataTransfer.getData('text/plain')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as SellDragPayload
      if (parsed && (parsed.source === 'inventory' || parsed.source === 'cart') && typeof parsed.itemId === 'string') {
        return parsed
      }
    } catch {
      // ignore
    }
    return null
  }

  if (!hasBuy && !hasSell) {
    return (
      <AnimatedModal onClose={onClose} panelClassName="panel modal wide shop-modal">
        <ModalHeader title={npc.label} onClose={onClose} closeLabel="Cancel" />
        <ModalScrollBody>
          <p className="muted">This shop has nothing configured.</p>
        </ModalScrollBody>
      </AnimatedModal>
    )
  }

  const isBuy = activeTab === 'buy'
  const cart = isBuy ? buyCart : sellCart

  return (
    <>
      <AnimatedModal onClose={onClose} panelClassName="panel modal wide shop-modal">
      <div className="shop-modal__header row spread modal-drag-handle modal-header">
        <div>
          <h2 className="modal-title">{npc.label}</h2>
          <p className="muted small" style={{ margin: '0.15rem 0 0' }}>
            Zeny: {character.zeny}
          </p>
        </div>
        <div className="modal-header__end shop-modal__header-end">
          {hasBuy && (
            <div className="shop-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={isBuy}
                className={isBuy ? undefined : 'secondary'}
                onClick={() => setActiveTab('buy')}
              >
                Buy
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isBuy}
                className={!isBuy ? undefined : 'secondary'}
                onClick={() => setActiveTab('sell')}
              >
                Sell
              </button>
            </div>
          )}
          <ModalCloseButton onClose={onClose} label="Cancel" />
        </div>
      </div>

      <ModalScrollBody>
      <div className="shop-modal__grid two-col">
        {isBuy ? (
          <>
            <ShopCatalogPane
              title="Items"
              rows={buyCatalogRows}
              emptyMessage="Nothing for sale."
              onAdd={handleAddBuy}
            />
            <ShopCartPane
              title="Cart"
              cart={buyCart}
              priceByItemId={buyPrices}
              onRemove={(id) => setBuyCart((c) => removeFromCart(c, id))}
            />
          </>
        ) : (
          <>
            <section className="shop-pane shop-pane--catalog">
              <h3 className="shop-pane__title">Inventory</h3>
              <div
                className="shop-pane__list"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (sellDragPrompt) return
                  const payload = readSellDragPayload(e.dataTransfer)
                  if (!payload || payload.source !== 'cart') return
                  const cartQty = sellCart[payload.itemId] ?? 0
                  if (cartQty <= 0) return
                  setSellDragQty(1)
                  setSellDragPrompt({ mode: 'putBack', itemId: payload.itemId, maxQty: cartQty })
                }}
              >
                {sellInventoryRows.length === 0 ? (
                  <p className="muted small shop-pane__empty">Nothing to sell.</p>
                ) : (
                  sellInventoryRows.map(({ itemId, ownedQty, unitPrice, maxAdd }) => {
                    const disabled = unitPrice <= 0 || maxAdd <= 0
                    return (
                      <ItemHoverTooltip key={itemId} itemId={itemId} quantity={ownedQty}>
                        <button
                          type="button"
                          className="shop-row"
                          disabled={disabled}
                          draggable={!disabled}
                          onDragStart={(e) => {
                            if (disabled) return
                            writeSellDragPayload(e.dataTransfer, { source: 'inventory', itemId })
                          }}
                          onClick={() => handleSellAddSingle(itemId)}
                          onDoubleClick={() => handleSellAddAll(itemId)}
                        >
                          <ItemIcon itemId={itemId} size={28} className="shop-row__icon" alt="" />
                          <span className="shop-row__name">
                            {formatSellInventoryRowLabel(getItemDisplayName(itemId), ownedQty, unitPrice)}
                          </span>
                        </button>
                      </ItemHoverTooltip>
                    )
                  })
                )}
              </div>
            </section>

            <section className="shop-pane shop-pane--cart">
              <h3 className="shop-pane__title">Cart</h3>
              <div
                className="shop-pane__list"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (sellDragPrompt) return
                  const payload = readSellDragPayload(e.dataTransfer)
                  if (!payload || payload.source !== 'inventory') return
                  const ownedQty = ownedByItemId[payload.itemId] ?? 0
                  const inCartQty = sellCart[payload.itemId] ?? 0
                  const maxAdd = ownedQty - inCartQty
                  if (maxAdd <= 0) return
                  setSellDragQty(1)
                  setSellDragPrompt({ mode: 'add', itemId: payload.itemId, maxQty: maxAdd })
                }}
              >
                {cartEntries(sellCart).length === 0 ? (
                  <p className="muted small shop-pane__empty">Drag items here or click inventory items to add.</p>
                ) : (
                  cartEntries(sellCart).map(({ itemId, quantity }) => {
                    const unit = sellPriceByItemId[itemId] ?? 0
                    return (
                      <ItemHoverTooltip key={itemId} itemId={itemId} quantity={quantity}>
                        <button
                          type="button"
                          className="shop-row shop-row--cart"
                          onClick={() => setSellCart((c) => removeFromCart(c, itemId))}
                          draggable
                          onDragStart={(e) => {
                            writeSellDragPayload(e.dataTransfer, { source: 'cart', itemId })
                          }}
                          aria-label="Click to remove one"
                        >
                          <ItemIcon itemId={itemId} size={28} className="shop-row__icon" alt="" />
                          <span className="shop-row__name">{getItemDisplayName(itemId)}</span>
                          <span className="shop-row__qty">×{quantity}</span>
                          <span className="shop-row__price">{unit * quantity} z</span>
                        </button>
                      </ItemHoverTooltip>
                    )
                  })
                )}
              </div>
              <div className="shop-pane__total">
                Total: <strong>{sellTotal}</strong> z
              </div>
            </section>
          </>
        )}
      </div>

      <div className="shop-modal__actions row spread">
        <p className="muted small shop-modal__hint">
          {isBuy
            ? 'Click an item to add to cart.'
            : 'Click to add 1. Double-click to add all. Drag for quantity. Cart: click to remove 1, drag back to choose quantity.'}
        </p>
        <div className="row" style={{ gap: '0.5rem' }}>
          {isBuy ? (
            <button
              type="button"
              disabled={busy || cartEntries(cart).length === 0 || buyTotal > character.zeny}
              onClick={() => void confirmBuy()}
            >
              Buy
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || cartEntries(cart).length === 0 || !sellCartValid}
              onClick={() => void confirmSell()}
            >
              Sell
            </button>
          )}
        </div>
      </div>
        </ModalScrollBody>
      </AnimatedModal>

      {sellDragPrompt && (
        <AnimatedModal onClose={() => setSellDragPrompt(null)} panelClassName="panel modal">
          <ModalHeader
            title={sellDragPrompt.mode === 'add' ? 'Add quantity' : 'Put back quantity'}
            onClose={() => setSellDragPrompt(null)}
            closeLabel="Cancel"
          />
          <ModalScrollBody>
            <p className="muted small" style={{ margin: '0 0 0.75rem' }}>
              {sellDragPrompt.mode === 'add' ? 'How many to add to the cart?' : 'How many to put back into inventory?'}
            </p>
            <div className="row" style={{ alignItems: 'center', gap: '0.75rem' }}>
              <label className="row" style={{ margin: 0, gap: '0.5rem' }}>
                Quantity
                <input
                  type="number"
                  value={sellDragQty}
                  min={1}
                  max={sellDragPrompt.maxQty}
                  onChange={(e) => setSellDragQty(Number(e.target.value))}
                />
              </label>
              <span className="muted small">max {sellDragPrompt.maxQty}</span>
            </div>
            <div className="row" style={{ marginTop: '1rem', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="secondary" onClick={() => setSellDragPrompt(null)}>
                Cancel
              </button>
              <button type="button" onClick={() => confirmSellDragPrompt()}>
                Set
              </button>
            </div>
          </ModalScrollBody>
        </AnimatedModal>
      )}
    </>
  )
}
