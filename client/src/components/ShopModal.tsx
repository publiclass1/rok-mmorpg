import { useMemo, useState } from 'react'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { getItemDisplayName } from '../game/character/itemCatalog'
import {
  addToCart,
  cartEntries,
  cartTotal,
  clearCart,
  pricesFromStock,
  removeFromCart,
  type ShopCart,
} from '../game/character/shopCart'
import { shopBuysFromNpcConfig, shopStockFromNpcConfig } from '../game/character/npcServices'
import { emitGameEvent } from '../game/events'
import type { CharacterSheetPayload } from '../game/events'
import type { CharacterRow, NpcRow } from '../types/database'
import { supabase } from '../lib/supabase'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  character: CharacterRow
  npc: NpcRow
  sheet: CharacterSheetPayload
  onClose: () => void
  onCharacterUpdated: (character: CharacterRow) => void
}

type ShopTab = 'buy' | 'sell'

function countItemInSession(sheet: CharacterSheetPayload, itemId: string): number {
  return sheet.sessionInventory
    .filter((s) => s.itemId === itemId)
    .reduce((sum, s) => sum + s.quantity, 0)
}

function formatRowLabel(name: string, qtyLabel: string, price: number): string {
  return `${name} (${qtyLabel}) — ${price} z`
}

type CatalogRow = { itemId: string; price: number; qtyLabel: string; maxAdd?: number }

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
              <button
                key={row.itemId}
                type="button"
                className="shop-row"
                disabled={atMax}
                onClick={() => onAdd(row.itemId)}
              >
                <span className="shop-row__name">
                  {formatRowLabel(getItemDisplayName(row.itemId), row.qtyLabel, row.price)}
                </span>
              </button>
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
              <button
                key={itemId}
                type="button"
                className="shop-row shop-row--cart"
                onClick={() => onRemove(itemId)}
                title="Click to remove one"
              >
                <span className="shop-row__name">{getItemDisplayName(itemId)}</span>
                <span className="shop-row__qty">×{quantity}</span>
                <span className="shop-row__price">{unit * quantity} z</span>
              </button>
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

export function ShopModal({ character, npc, sheet, onClose, onCharacterUpdated }: Props) {
  const stock = shopStockFromNpcConfig(npc.config)
  const buys = shopBuysFromNpcConfig(npc.config)
  const buyPrices = useMemo(() => pricesFromStock(stock), [stock])
  const sellPrices = useMemo(() => pricesFromStock(buys), [buys])

  const hasBuy = stock.length > 0
  const hasSell = buys.length > 0
  const [activeTab, setActiveTab] = useState<ShopTab>(() => (hasBuy ? 'buy' : 'sell'))
  const [buyCart, setBuyCart] = useState<ShopCart>({})
  const [sellCart, setSellCart] = useState<ShopCart>({})
  const [busy, setBusy] = useState(false)

  const buyTotal = cartTotal(buyCart, buyPrices)
  const sellTotal = cartTotal(sellCart, sellPrices)

  const buyCatalogRows: CatalogRow[] = stock.map((row) => ({
    itemId: row.itemId,
    price: row.price,
    qtyLabel: '∞',
  }))

  const sellCatalogRows: CatalogRow[] = buys.map((row) => {
    const owned = countItemInSession(sheet, row.itemId)
    const inCart = sellCart[row.itemId] ?? 0
    return {
      itemId: row.itemId,
      price: row.price,
      qtyLabel: String(owned),
      maxAdd: owned - inCart,
    }
  })

  const sellCartValid = cartEntries(sellCart).every(
    ({ itemId, quantity }) => quantity <= countItemInSession(sheet, itemId),
  )

  async function adjustZeny(delta: number): Promise<boolean> {
    const next = character.zeny + delta
    if (next < 0) return false
    const { data, error } = await supabase
      .from('characters')
      .update({ zeny: next })
      .eq('id', character.id)
      .select('*')
      .single()
    if (error || !data) return false
    onCharacterUpdated(data as CharacterRow)
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
      for (const { itemId, quantity } of entries) {
        dispatchCharacterAction({ type: 'shopRemoveItem', itemId, quantity })
      }
      const ok = await adjustZeny(sellTotal)
      if (!ok) {
        emitGameEvent('status', 'Could not credit zeny.')
        return
      }
      setSellCart(clearCart())
    } finally {
      setBusy(false)
    }
  }

  function handleAddBuy(itemId: string) {
    setBuyCart((c) => addToCart(c, itemId))
  }

  function handleAddSell(itemId: string) {
    const owned = countItemInSession(sheet, itemId)
    setSellCart((c) => addToCart(c, itemId, owned))
  }

  if (!hasBuy && !hasSell) {
    return (
      <AnimatedModal onClose={onClose} panelClassName="panel modal wide shop-modal">
        <div className="row spread modal-drag-handle">
          <h2 style={{ margin: 0 }}>{npc.label}</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
        <p className="muted">This shop has nothing configured.</p>
      </AnimatedModal>
    )
  }

  const isBuy = activeTab === 'buy'
  const cart = isBuy ? buyCart : sellCart

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal wide shop-modal">
      <div className="shop-modal__header row spread modal-drag-handle">
        <div>
          <h2 style={{ margin: 0 }}>{npc.label}</h2>
          <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
            Zeny: {character.zeny}
          </p>
        </div>
        {(hasBuy && hasSell) && (
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
      </div>

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
            <ShopCatalogPane
              title="Sell list"
              rows={sellCatalogRows}
              emptyMessage="Nothing this shop buys."
              onAdd={handleAddSell}
            />
            <ShopCartPane
              title="Cart"
              cart={sellCart}
              priceByItemId={sellPrices}
              onRemove={(id) => setSellCart((c) => removeFromCart(c, id))}
            />
          </>
        )}
      </div>

      <div className="shop-modal__actions row spread">
        <p className="muted small shop-modal__hint">
          {isBuy ? 'Click an item to add to cart.' : 'Click your item to add; click cart line to remove one.'}
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
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
