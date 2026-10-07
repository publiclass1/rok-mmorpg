import { useEffect, useState } from 'react'
import { transferStorage } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { CharacterRow, ItemRow, NpcRow, StorageRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'

type InvRow = { item_id: string; quantity: number }

type Props = {
  character: CharacterRow
  npc: NpcRow
  position: { x: number; y: number; mapId: string }
  onClose: () => void
}

export function StorageModal({ character, npc, position, onClose }: Props) {
  const [items, setItems] = useState<ItemRow[]>([])
  const [inventory, setInventory] = useState<InvRow[]>([])
  const [storage, setStorage] = useState<StorageRow[]>([])
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [itemRes, invRes, storageRes] = await Promise.all([
      supabase.from('items').select('*'),
      supabase.from('character_inventory').select('item_id, quantity').eq('character_id', character.id),
      supabase.from('account_storage').select('*'),
    ])
    setItems(itemRes.data ?? [])
    setInventory(invRes.data ?? [])
    setStorage(storageRes.data ?? [])
  }

  useEffect(() => {
    void refresh()
  }, [character.id])

  const itemName = (id: string) => items.find((i) => i.id === id)?.name ?? id

  async function move(direction: 'to_storage' | 'to_character', itemId: string, quantity: number) {
    setError(null)
    if (itemId.startsWith('ri:')) {
      setError('Dungeon gear cannot be stored in Kafra yet.')
      return
    }
    try {
      await transferStorage({
        characterId: character.id,
        direction,
        itemId,
        quantity,
        mapId: position.mapId,
        x: position.x,
        y: position.y,
        npcId: npc.id,
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed')
    }
  }

  return (
    <AnimatedModal onClose={onClose} role="dialog" aria-modal="true" panelClassName="modal panel">
        <header className="row spread modal-drag-handle">
          <h2>{npc.label} — Storage</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </header>
        {error && <p className="error">{error}</p>}
        <div className="two-col">
          <section>
            <h3>Character inventory</h3>
            <ul className="item-list">
              {inventory.map((row) => (
                <li key={row.item_id} className="row spread">
                  <span>
                    {itemName(row.item_id)} × {row.quantity}
                  </span>
                  <button type="button" onClick={() => void move('to_storage', row.item_id, 1)}>
                    To storage
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>Account storage (shared)</h3>
            <ul className="item-list">
              {storage.map((row) => (
                <li key={row.id} className="row spread">
                  <span>
                    {itemName(row.item_id)} × {row.quantity}
                  </span>
                  <button type="button" onClick={() => void move('to_character', row.item_id, 1)}>
                    To character
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
    </AnimatedModal>
  )
}
