import { useEffect, useState } from 'react'
import { tradeManage } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { CharacterRow, ItemRow, TradeOfferRow, TradeSessionRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  character: CharacterRow
  partner: { characterId: string; name: string }
  initialTrade?: TradeSessionRow | null
  onClose: () => void
  onComplete: () => void
}

export function TradeModal({ character, partner, initialTrade, onClose, onComplete }: Props) {
  const [trade, setTrade] = useState<TradeSessionRow | null>(null)
  const [offers, setOffers] = useState<TradeOfferRow[]>([])
  const [inventory, setInventory] = useState<Array<{ item_id: string; quantity: number }>>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [zenyOffer, setZenyOffer] = useState('0')

  async function loadInventory() {
    const [{ data: inv }, { data: catalog }] = await Promise.all([
      supabase.from('character_inventory').select('item_id, quantity').eq('character_id', character.id),
      supabase.from('items').select('*'),
    ])
    setInventory(inv ?? [])
    setItems(catalog ?? [])
  }

  async function loadOffers(sessionId: string) {
    const { data } = await supabase.from('trade_offers').select('*').eq('trade_session_id', sessionId)
    setOffers(data ?? [])
  }

  useEffect(() => {
    void loadInventory()
    void (async () => {
      if (initialTrade) {
        setTrade(initialTrade)
        await loadOffers(initialTrade.id)
        return
      }
      try {
        const res = await tradeManage({
          action: 'request',
          characterId: character.id,
          partnerCharacterId: partner.characterId,
        })
        if (res.trade) {
          setTrade(res.trade)
          await loadOffers(res.trade.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start trade')
      }
    })()
  }, [character.id, partner.characterId, initialTrade?.id])

  useEffect(() => {
    if (!trade) return
    const channel = supabase
      .channel(`trade:${trade.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_sessions', filter: `id=eq.${trade.id}` },
        (payload) => {
          const row = payload.new as TradeSessionRow
          setTrade(row)
          if (row.state === 'completed' || row.state === 'cancelled') {
            onComplete()
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_offers', filter: `trade_session_id=eq.${trade.id}` },
        () => {
          void loadOffers(trade.id)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [trade?.id])

  const itemName = (id: string | null) => (id ? (items.find((i) => i.id === id)?.name ?? id) : 'Zeny')

  async function run(action: string, extra: Record<string, unknown> = {}) {
    if (!trade) return
    setError(null)
    try {
      const res = await tradeManage({
        action,
        characterId: character.id,
        tradeSessionId: trade.id,
        ...extra,
      })
      if (res.trade) setTrade(res.trade)
      await loadOffers(trade.id)
      if (res.trade?.state === 'completed') onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade action failed')
    }
  }

  const myOffers = offers.filter((o) => o.character_id === character.id)
  const theirOffers = offers.filter((o) => o.character_id === partner.characterId)

  return (
    <AnimatedModal onClose={onClose} role="dialog" aria-modal="true" panelClassName="modal panel wide">
        <ModalHeader
          title={`Trade · ${partner.name}`}
          onClose={() => void run('cancel').then(onClose)}
          closeLabel="Cancel trade"
        />
        <ModalScrollBody>
        {error && <p className="error">{error}</p>}
        {trade && <p className="muted">State: {trade.state}</p>}

        <div className="two-col">
          <section>
            <h3>Your offer</h3>
            <ul className="item-list">
              {myOffers.map((o) => (
                <li key={o.id}>
                  {o.item_id ? `${itemName(o.item_id)} × ${o.quantity}` : `${o.zeny} zeny`}
                </li>
              ))}
            </ul>
            <div className="stack compact">
              <label>
                Offer item
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const itemId = e.target.value
                    if (itemId) void run('add_item', { itemId, quantity: 1 })
                    e.target.value = ''
                  }}
                  disabled={trade?.state !== 'open'}
                >
                  <option value="">Select…</option>
                  {inventory.map((row) => (
                    <option key={row.item_id} value={row.item_id}>
                      {itemName(row.item_id)} ({row.quantity})
                    </option>
                  ))}
                </select>
              </label>
              <label className="row">
                Zeny
                <input value={zenyOffer} onChange={(e) => setZenyOffer(e.target.value)} disabled={trade?.state !== 'open'} />
                <button type="button" onClick={() => void run('add_zeny', { zeny: Number(zenyOffer) })} disabled={trade?.state !== 'open'}>
                  Set
                </button>
              </label>
            </div>
          </section>
          <section>
            <h3>{partner.name}&apos;s offer</h3>
            <ul className="item-list">
              {theirOffers.map((o) => (
                <li key={o.id}>
                  {o.item_id ? `${itemName(o.item_id)} × ${o.quantity}` : `${o.zeny} zeny`}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="row">
          {trade?.state === 'pending' && trade.partner_character_id === character.id && (
            <button type="button" onClick={() => void run('accept')}>
              Accept trade
            </button>
          )}
          {trade?.state === 'open' && (
            <button type="button" onClick={() => void run('lock')}>
              Lock offers
            </button>
          )}
          {trade?.state === 'locked' && (
            <button type="button" onClick={() => void run('confirm')}>
              Confirm trade
            </button>
          )}
        </footer>
        </ModalScrollBody>
    </AnimatedModal>
  )
}
