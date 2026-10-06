import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { savePoint, teleport } from '../lib/api'
import { supabase } from '../lib/supabase'
import { registerCharacterActionContext } from '../game/character/characterActionDispatch'
import { sessionFromSheetPayload, toCharacterSheetPayload } from '../game/character/characterSheet'
import { createInitialCharacterState } from '../game/character/characterState'
import { createPhaserGame } from '../game/createGame'
import {
  emitGameEvent,
  onGameEvent,
  type CharacterSheetPayload,
  type ActivityLogEntry,
  type SelectedMobPayload,
} from '../game/events'
import type { CharacterRow, NpcRow, TradeSessionRow } from '../types/database'
import { ActivityLog } from './ActivityLog'
import { SkillBar } from './SkillBar'
import { SkillsWindow } from './SkillsWindow'
import { EquipmentWindow } from './EquipmentWindow'
import { InventoryWindow } from './InventoryWindow'
import { StatsWindow } from './StatsWindow'
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
  const sessionRef = useRef(createInitialCharacterState())
  const [sheet, setSheet] = useState<CharacterSheetPayload>(() =>
    toCharacterSheetPayload(sessionRef.current),
  )
  const [statsOpen, setStatsOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [selectedMob, setSelectedMob] = useState<SelectedMobPayload | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])

  const modalOpen =
    statsOpen || skillsOpen || inventoryOpen || equipmentOpen || !!storageNpc || !!tradePartner

  useEffect(() => {
    emitGameEvent('uiPointerLock', modalOpen)
  }, [modalOpen])

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
    registerCharacterActionContext({
      getSession: () => sessionRef.current,
      setSession: (state) => {
        sessionRef.current = state
      },
      setSheet,
    })
    return () => registerCharacterActionContext(null)
  }, [])

  useEffect(() => {
    const unsubs = [
      onGameEvent('npcNearby', setNearbyNpc),
      onGameEvent('position', setPosition),
      onGameEvent('status', setStatus),
      onGameEvent('remotePlayers', setRemotePlayers),
      onGameEvent('characterSheet', (payload) => {
        sessionRef.current = sessionFromSheetPayload(payload, sessionRef.current)
        setSheet(payload)
      }),
      onGameEvent('playerStats', (p) => {
        setSheet((s) => ({ ...s, ...p }))
      }),
      onGameEvent('selectedMob', setSelectedMob),
      onGameEvent('activityLog', (entry) => {
        setActivityLog((prev) => [...prev, entry].slice(-100))
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  useEffect(() => {
    if (!hostRef.current || !npcsReady) return

    const game = createPhaserGame(hostRef.current, character, npcs, sessionRef.current)
    gameRef.current = game
    queueMicrotask(() => {
      emitGameEvent('sessionSync', structuredClone(sessionRef.current))
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [character.id, character.map_id, npcsReady, npcs])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setStatsOpen((o) => !o)
        return
      }
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSkillsOpen((o) => !o)
        return
      }
      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setInventoryOpen((o) => !o)
        return
      }
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setEquipmentOpen((o) => !o)
        return
      }
      if (e.key.toLowerCase() === 'e' && nearbyNpc) {
        void handleNpc(nearbyNpc)
        return
      }
      if (modalOpen) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 9) {
        e.preventDefault()
        emitGameEvent('useSkillSlot', { slot: num - 1 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearbyNpc, position, character, modalOpen])

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
    <div className="game-shell ro-layout">
      <header className="hud row spread">
        <div>
          <strong>{character.name}</strong>
          <span className="muted">
            {' '}
            · {character.map_id} · Lv {sheet.baseLevel} · Job {sheet.jobLevel} · HP {sheet.hp}/{sheet.hpMax} · MP{' '}
            {sheet.mp}/{sheet.mpMax}
          </span>
        </div>
        <div className="row">
          <button type="button" className="secondary" onClick={() => setStatsOpen(true)}>Stats</button>
          <button type="button" className="secondary" onClick={() => setInventoryOpen(true)}>Inventory</button>
          <button type="button" className="secondary" onClick={() => setEquipmentOpen(true)}>Equip</button>
          <button type="button" className="secondary" onClick={() => setSkillsOpen(true)}>Skills</button>
          <span className="muted">{status}</span>
          <button type="button" className="secondary" onClick={onExit}>Leave world</button>
        </div>
      </header>

      <div className="game-stage">
        <div ref={hostRef} className="game-canvas" />
        <div className="game-bottom-dock">
          <SkillBar sheet={sheet} />
          <ActivityLog entries={activityLog} />
        </div>
      </div>

      <aside className="side-panel panel compact-side">
        <h3>Target</h3>
        {selectedMob ? (
          <div className="target-panel">
            <p><strong>{selectedMob.name}</strong></p>
            <p className="muted small">Lv {selectedMob.level}</p>
            <p>HP {selectedMob.hp} / {selectedMob.hpMax}</p>
          </div>
        ) : (
          <p className="muted small">Click a mob to select</p>
        )}
        <h3>Nearby</h3>
        <ul className="item-list">
          {remotePlayers.map((p) => (
            <li key={p.characterId} className="row spread">
              <span>{p.name}</span>
              <button type="button" onClick={() => setTradePartner({ characterId: p.characterId, name: p.name })}>
                Trade
              </button>
            </li>
          ))}
          {remotePlayers.length === 0 && <li className="muted">Alone on map</li>}
        </ul>
        <p className="muted small">
          Click move · Space jump · 1 attack · Alt+S stats · Alt+I inventory · Alt+E equip · Alt+K skills · E NPC
        </p>
        {nearbyNpc && (
          <p>Near: <strong>{nearbyNpc.label}</strong> — E</p>
        )}
        {message && <p>{message}</p>}
      </aside>

      {statsOpen && <StatsWindow sheet={sheet} onClose={() => setStatsOpen(false)} />}
      {inventoryOpen && (
        <InventoryWindow
          characterId={character.id}
          sheet={sheet}
          onClose={() => setInventoryOpen(false)}
        />
      )}
      {equipmentOpen && <EquipmentWindow sheet={sheet} onClose={() => setEquipmentOpen(false)} />}
      {skillsOpen && <SkillsWindow sheet={sheet} onClose={() => setSkillsOpen(false)} />}

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
