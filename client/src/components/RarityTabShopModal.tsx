import { useMemo, useState } from 'react'
import type { GearRarityId } from '../content/ro/types'
import { toCharacterSheetPayload } from '../game/character/characterSheet'
import { formatEquipRequirements, meetsEquipRequirements } from '../game/character/equipRequirements'
import { getItemDisplayName, isEquippable } from '../game/character/itemCatalog'
import { shopStockFromNpcConfig } from '../game/character/npcServices'
import {
  GEAR_RARITY_ORDER,
  getBaseItemRarity,
  rarityColor,
  rarityLabel,
} from '../game/items/itemRarity'
import {
  addToCart,
  cartEntries,
  cartTotal,
  clearCart,
  pricesFromStock,
  removeFromCart,
  type ShopCart,
} from '../game/character/shopCart'
import { emitGameEvent, sessionSyncPayload } from '../game/events'
import { loadCharacterSession } from '../lib/characterProgress'
import { rarityShopBuy } from '../lib/api'
import { apiFetch } from '../lib/http'
import type { CharacterSheetPayload } from '../game/events'
import type { CharacterRow, NpcRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalCloseButton } from './motion/ModalCloseButton'
import { ItemHoverTooltip } from './ItemHoverTooltip'
import { ItemIcon } from './ItemIcon'

type Props = {
  character: CharacterRow
  npc: NpcRow
  sheet: CharacterSheetPayload
  initialTab?: 'buy' | 'sell'
  onClose: () => void
  onCharacterUpdated: (character: CharacterRow) => void
}

function formatRowLabel(name: string, price: number): string {
  return `${name} — ${price} z`
}

export function RarityTabShopModal({
  character,
  npc,
  sheet,
  onClose,
  onCharacterUpdated,
}: Props) {
  const stock = shopStockFromNpcConfig(npc.config)
  const buyPrices = useMemo(() => pricesFromStock(stock), [stock])
  const [activeRarity, setActiveRarity] = useState<GearRarityId>('common')
  const [buyCart, setBuyCart] = useState<ShopCart>({})
  const [busy, setBusy] = useState(false)

  const buyTotal = cartTotal(buyCart, buyPrices)
  const equipContext = useMemo(
    () => ({ baseLevel: sheet.baseLevel, jobId: sheet.jobId }),
    [sheet.baseLevel, sheet.jobId],
  )

  const catalogRows = stock.filter((row) => getBaseItemRarity(row.itemId) === activeRarity)

  const tabsWithStock = useMemo(() => {
    const set = new Set<GearRarityId>()
    for (const row of stock) {
      const r = getBaseItemRarity(row.itemId)
      if (r) set.add(r)
    }
    return GEAR_RARITY_ORDER.filter((r) => set.has(r))
  }, [stock])

  async function confirmBuy() {
    const entries = cartEntries(buyCart)
    if (entries.length === 0) return
    if (buyTotal > character.zeny) {
      emitGameEvent('status', 'Not enough zeny.')
      return
    }
    setBusy(true)
    try {
      await rarityShopBuy({
        characterId: character.id,
        npcId: npc.id,
        lines: entries,
      })
      const session = await apiFetch<{ character: CharacterRow }>(`/api/characters/${character.id}/session`)
      if (session.character) onCharacterUpdated(session.character)
      const loaded = await loadCharacterSession(character.id)
      emitGameEvent('sessionSync', sessionSyncPayload(loaded, { persist: false }))
      emitGameEvent('characterSheet', toCharacterSheetPayload(loaded))
      setBuyCart(clearCart())
      emitGameEvent('status', 'Purchase complete.')
    } catch (err) {
      emitGameEvent('status', err instanceof Error ? err.message : 'Purchase failed.')
    } finally {
      setBusy(false)
    }
  }

  if (stock.length === 0) {
    return (
      <AnimatedModal onClose={onClose} panelClassName="panel modal wide shop-modal">
        <h2 className="modal-title">{npc.label}</h2>
        <p className="muted">This shop has nothing configured.</p>
        <ModalCloseButton onClose={onClose} label="Close" />
      </AnimatedModal>
    )
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal wide shop-modal rarity-shop-modal">
      <div className="shop-modal__header row spread modal-drag-handle">
        <div>
          <h2 className="modal-title">{npc.label}</h2>
          <p className="muted small" style={{ margin: '0.15rem 0 0' }}>
            Zeny: {character.zeny} · Cosmetic gear (no stat bonuses)
          </p>
        </div>
        <ModalCloseButton onClose={onClose} label="Cancel" />
      </div>

      <div className="rarity-shop-tabs" role="tablist">
        {tabsWithStock.map((rarity) => {
          const active = activeRarity === rarity
          const color = rarityColor(rarity)
          return (
            <button
              key={rarity}
              type="button"
              role="tab"
              aria-selected={active}
              className={`rarity-shop-tab${active ? ' rarity-shop-tab--active' : ''}`}
              style={{
                ['--rarity-color' as string]: color,
                borderColor: active ? color : undefined,
                color: active ? color : undefined,
              }}
              onClick={() => setActiveRarity(rarity)}
            >
              {rarityLabel(rarity)}
            </button>
          )
        })}
      </div>

      <div className="shop-modal__grid two-col">
        <section className="shop-pane shop-pane--catalog">
          <h3 className="shop-pane__title">{rarityLabel(activeRarity)} gear</h3>
          <div className="shop-pane__list">
            {catalogRows.length === 0 ? (
              <p className="muted small shop-pane__empty">Nothing in this tier.</p>
            ) : (
              catalogRows.map((row) => {
                const requirementHint =
                  isEquippable(row.itemId) ? formatEquipRequirements(row.itemId) ?? undefined : undefined
                const unmetRequirements =
                  requirementHint != null && !meetsEquipRequirements(equipContext, row.itemId)
                return (
                  <ItemHoverTooltip key={row.itemId} itemId={row.itemId}>
                    <button
                      type="button"
                      className={`shop-row${unmetRequirements ? ' shop-row--unmet' : ''}`}
                      onClick={() => setBuyCart((c) => addToCart(c, row.itemId))}
                    >
                      <ItemIcon itemId={row.itemId} size={28} className="shop-row__icon" alt="" />
                      <span className="shop-row__name" style={{ color: rarityColor(activeRarity) }}>
                        {formatRowLabel(getItemDisplayName(row.itemId), row.price)}
                      </span>
                      {requirementHint ? (
                        <span className="shop-row__req muted small">{requirementHint}</span>
                      ) : null}
                    </button>
                  </ItemHoverTooltip>
                )
              })
            )}
          </div>
        </section>

        <section className="shop-pane shop-pane--cart">
          <h3 className="shop-pane__title">Cart</h3>
          <div className="shop-pane__list">
            {cartEntries(buyCart).length === 0 ? (
              <p className="muted small shop-pane__empty">Click items on the left to add them here.</p>
            ) : (
              cartEntries(buyCart).map(({ itemId, quantity }) => {
                const unit = buyPrices[itemId] ?? 0
                const r = getBaseItemRarity(itemId)
                return (
                  <ItemHoverTooltip key={itemId} itemId={itemId} quantity={quantity}>
                    <button
                      type="button"
                      className="shop-row shop-row--cart"
                      onClick={() => setBuyCart((c) => removeFromCart(c, itemId))}
                      aria-label="Click to remove one"
                    >
                      <ItemIcon itemId={itemId} size={28} className="shop-row__icon" alt="" />
                      <span
                        className="shop-row__name"
                        style={r ? { color: rarityColor(r) } : undefined}
                      >
                        {getItemDisplayName(itemId)}
                      </span>
                      <span className="shop-row__qty">×{quantity}</span>
                      <span className="shop-row__price">{unit * quantity} z</span>
                    </button>
                  </ItemHoverTooltip>
                )
              })
            )}
          </div>
          <div className="shop-pane__total">
            Total: <strong>{buyTotal}</strong> z
          </div>
        </section>
      </div>

      <div className="shop-modal__actions row spread">
        <p className="muted small shop-modal__hint">Click an item to add to cart.</p>
        <button
          type="button"
          disabled={busy || cartEntries(buyCart).length === 0 || buyTotal > character.zeny}
          onClick={() => void confirmBuy()}
        >
          Buy
        </button>
      </div>
    </AnimatedModal>
  )
}
