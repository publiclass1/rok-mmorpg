import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { savePoint, teleport } from '../lib/api'
import { supabase } from '../lib/supabase'
import { createPhaserGame } from '../game/createGame'
import { emitGameEvent, onGameEvent } from '../game/events'
import type { CharacterRow, NpcRow, TradeSessionRow } from '../types/database'
import { StorageModal } from './StorageModal'
import { TradeModal } from './TradeModal'

type Props = {
  character: CharacterRow
  onCharacterUpdated: (character: CharacterRow) => void
  onExit: () => void
}

export function GameView({ character, onCharacterUpdated, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [npcs, setNpcs] = useState<NpcRow[]>([])
  const [npcsReady, setNpcsReady] = useState(false)
  const [nearbyNpc, setNearbyNpc] = useState<NpcRow | null>(null)
  const [position, setPosition] = useState({ x: character.x, y: character.y, mapId: character.map_id })
  const [status, setStatus] = useState('')
  const [storageNpc, setStorageNpc] = useState<NpcRow | null>(null)
  const [remotePlayers, setRemotePlayers] = useState<
    Array<{ characterId: string; name: string; x: number; y: number }>
  >([])
  const [tradePartner, setTradePartner] = useState<{
    characterId: string
    name: string
    initialTrade?: TradeSessionRow | null
  } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setNpcsReady(false)
    void supabase
      .from('npc_definitions')
      .select('*')
      .eq('map_id', character.map_id)
      .then(({ data }) => {
        setNpcs(data ?? [])
        setNpcsReady(true)
      })
  }, [character.map_id])

  useEffect(() => {
    const channel = supabase
      .channel(`incoming-trades:${character.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trade_sessions' },
        async (payload) => {
          const row = payload.new as TradeSessionRow
          if (row.partner_character_id !== character.id || row.state !== 'pending') return
          const { data } = await supabase
            .from('characters')
            .select('name')
            .eq('id', row.initiator_character_id)
            .single()
          setTradePartner({
            characterId: row.initiator_character_id,
            name: data?.name ?? 'Adventurer',
            initialTrade: row,
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [character.id])

  useEffect(() => {
    const unsubs = [
      onGameEvent('npcNearby', setNearbyNpc),
      onGameEvent('position', setPosition),
      onGameEvent('status', setStatus),
      onGameEvent('remotePlayers', setRemotePlayers),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  useEffect(() => {
    if (!hostRef.current || !npcsReady) return

    const game = createPhaserGame(hostRef.current, character, npcs)
    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [character.id, character.map_id, character.x, character.y, npcsReady, npcs])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'e' && nearbyNpc) {
        void handleNpc(nearbyNpc)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearbyNpc, position, character])

  async function handleNpc(npc: NpcRow) {
    setMessage(null)
    if (npc.npc_type === 'storage') {
      setStorageNpc(npc)
      return
    }
    if (npc.npc_type === 'save') {
      try {
        await savePoint({
          characterId: character.id,
          mapId: position.mapId,
          x: position.x,
          y: position.y,
          npcId: npc.id,
        })
        setMessage('Save point stored for your account.')
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Save failed')
      }
      return
    }
    if (npc.npc_type === 'teleport') {
      const destinations = npc.config?.destinations ?? []
      const dest = destinations[0]
      if (!dest) {
        setMessage('No destinations configured.')
        return
      }
      try {
        const res = await teleport({
          characterId: character.id,
          mapId: position.mapId,
          x: position.x,
          y: position.y,
          npcId: npc.id,
          destinationMapId: dest.map_id,
        })
        onCharacterUpdated(res.character)
        emitGameEvent('status', `Warped to ${dest.label}`)
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Warp failed')
      }
    }
  }

  return (
    <div className="game-shell">
      <header className="hud row spread">
        <div>
          <strong>{character.name}</strong>
          <span className="muted">
            {' '}
            · {character.map_id} · {character.zeny} z
          </span>
        </div>
        <div className="row">
          <span className="muted">{status}</span>
          <button type="button" className="secondary" onClick={onExit}>
            Leave world
          </button>
        </div>
      </header>

      <div ref={hostRef} className="game-canvas" />

      <aside className="side-panel panel">
        <h3>Nearby players</h3>
        <ul className="item-list">
          {remotePlayers.map((p) => (
            <li key={p.characterId} className="row spread">
              <span>{p.name}</span>
              <button type="button" onClick={() => setTradePartner({ characterId: p.characterId, name: p.name })}>
                Trade
              </button>
            </li>
          ))}
          {remotePlayers.length === 0 && <li className="muted">No one else on this map yet.</li>}
        </ul>
        <p className="muted small">WASD move · E interact with NPC when close</p>
        {nearbyNpc && (
          <p>
            Near: <strong>{nearbyNpc.label}</strong> ({nearbyNpc.npc_type}) — press E
          </p>
        )}
        {message && <p>{message}</p>}
      </aside>

      {storageNpc && (
        <StorageModal character={character} npc={storageNpc} position={position} onClose={() => setStorageNpc(null)} />
      )}

      {tradePartner && (
        <TradeModal
          character={character}
          partner={{ characterId: tradePartner.characterId, name: tradePartner.name }}
          initialTrade={tradePartner.initialTrade}
          onClose={() => setTradePartner(null)}
          onComplete={() => {
            setTradePartner(null)
            void supabase
              .from('characters')
              .select('*')
              .eq('id', character.id)
              .single()
              .then(({ data }) => {
                if (data) onCharacterUpdated(data)
              })
          }}
        />
      )}
    </div>
  )
}
