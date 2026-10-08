import { useEffect, useState } from 'react'
import { vendorManage } from '../lib/api'
import { getItemDisplayName } from '../game/character/itemCatalog'
import { loadCharacterSession } from '../lib/characterProgress'
import { supabase } from '../lib/supabase'
import type { CharacterRow, VendorListingRow } from '../types/database'
import { toCharacterSheetPayload } from '../game/character/characterSheet'
import { emitGameEvent, sessionSyncPayload } from '../game/events'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  buyer: CharacterRow
  sellerCharacterId: string
  sellerName: string
  stallTitle?: string | null
  onClose: () => void
  onCharacterUpdated: (c: CharacterRow) => void
  onMessage: (msg: string) => void
}

export function VendorShopModal({
  buyer,
  sellerCharacterId,
  sellerName,
  stallTitle,
  onClose,
  onCharacterUpdated,
  onMessage,
}: Props) {
  const [listings, setListings] = useState<VendorListingRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    void supabase
      .from('vendor_listings')
      .select('*')
      .eq('character_id', sellerCharacterId)
      .then(({ data }) => setListings(data ?? []))

    const channel = supabase
      .channel(`vendor-shop:${sellerCharacterId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendor_listings', filter: `character_id=eq.${sellerCharacterId}` },
        () => {
          void supabase
            .from('vendor_listings')
            .select('*')
            .eq('character_id', sellerCharacterId)
            .then(({ data }) => setListings(data ?? []))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [sellerCharacterId])

  async function buy(listing: VendorListingRow, qty: number) {
    setBusyId(listing.id)
    setError(null)
    try {
      await vendorManage({
        action: 'buy',
        characterId: buyer.id,
        sellerCharacterId,
        listingId: listing.id,
        quantity: qty,
      })
      const { data } = await supabase.from('characters').select('*').eq('id', buyer.id).single()
      if (data) onCharacterUpdated(data as CharacterRow)
      const loaded = await loadCharacterSession(buyer.id)
      emitGameEvent('sessionSync', sessionSyncPayload(loaded, { persist: false }))
      emitGameEvent('characterSheet', toCharacterSheetPayload(loaded))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
      onMessage(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AnimatedModal onClose={onClose}>
      <ModalHeader title={stallTitle ?? `${sellerName}'s shop`} onClose={onClose} />
      <ModalScrollBody>
      <div className="modal-panel">
        {error && <p className="small">{error}</p>}
        <ul className="item-list">
          {listings.map((row) => (
            <li key={row.id} className="row spread">
              <span className="small">
                {getItemDisplayName(row.item_id)} ×{row.quantity} — {row.price}z
              </span>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void buy(row, 1)}
              >
                Buy 1
              </button>
            </li>
          ))}
          {listings.length === 0 && <li className="muted small">No items listed</li>}
        </ul>
      </div>
      </ModalScrollBody>
    </AnimatedModal>
  )
}
