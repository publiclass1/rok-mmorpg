import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { savePoint, teleport } from '../lib/api'
import { loadCharacterSession, saveCharacterSession } from '../lib/characterProgress'
import { supabase } from '../lib/supabase'
import { JOB_NAMES } from '../game/character/skillsConfig'
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
import { JobMasterModal } from './JobMasterModal'
import { NpcOptionsModal, type NpcMenuChoice } from './NpcOptionsModal'
import { MapLoadingOverlay } from './MapLoadingOverlay'
import { TradeModal } from './TradeModal'
import { mapDisplayName } from '../game/world/mapDisplayName'

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
  const [jobMasterNpc, setJobMasterNpc] = useState<NpcRow | null>(null)
  const [npcMenu, setNpcMenu] = useState<NpcRow | null>(null)
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
  const [sessionReady, setSessionReady] = useState(false)
  const [sheet, setSheet] = useState<CharacterSheetPayload>(() =>
    toCharacterSheetPayload(sessionRef.current),
  )
  const [statsOpen, setStatsOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [selectedMob, setSelectedMob] = useState<SelectedMobPayload | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [mapLoading, setMapLoading] = useState<{ mapId: string; label: string } | null>(null)

  const modalOpen =
    statsOpen ||
    skillsOpen ||
    inventoryOpen ||
    equipmentOpen ||
    !!storageNpc ||
    !!jobMasterNpc ||
    !!npcMenu ||
    !!tradePartner

  useEffect(() => {
    setSessionReady(false)
    let cancelled = false
    void loadCharacterSession(character.id).then((loaded) => {
      if (cancelled) return
      sessionRef.current = loaded
      setSheet(toCharacterSheetPayload(loaded))
      setSessionReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [character.id])

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
    emitGameEvent('uiPointerLock', modalOpen)
  }, [modalOpen])

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
      onGameEvent('npcInteract', (npc) => setNpcMenu(npc)),
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
      onGameEvent('worldReady', ({ mapId }) => {
        setMapLoading((current) => (current?.mapId === mapId ? null : current))
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  useEffect(() => {
    if (!sessionReady || !npcsReady) return
    setMapLoading((current) => {
      if (current?.mapId === character.map_id) return current
      return {
        mapId: character.map_id,
        label: mapDisplayName(character.map_id),
      }
    })
  }, [character.map_id, sessionReady, npcsReady])

  useEffect(() => {
    if (!hostRef.current || !npcsReady || !sessionReady) return

    const game = createPhaserGame(hostRef.current, character, npcs, sessionRef.current)
    gameRef.current = game
    queueMicrotask(() => {
      emitGameEvent('sessionSync', structuredClone(sessionRef.current))
    })

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [character.id, character.map_id, npcsReady, npcs, sessionReady])

  async function leaveWorld() {
    try {
      await saveCharacterSession(character.id, sessionRef.current)
    } catch (err) {
      console.warn('Failed to save character progress', err)
    }
    onExit()
  }

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
      if (modalOpen) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 9) {
        e.preventDefault()
        emitGameEvent('useSkillSlot', { slot: num - 1 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  async function runNpcChoice(npc: NpcRow, choice: NpcMenuChoice) {
    setNpcMenu(null)
    setMessage(null)

    if (choice.kind === 'cancel') return

    if (choice.kind === 'storage') {
      setStorageNpc(npc)
      return
    }
    if (choice.kind === 'job_master') {
      setJobMasterNpc(npc)
      return
    }
    if (choice.kind === 'save') {
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
    if (choice.kind === 'teleport') {
      try {
        setMapLoading({
          mapId: choice.destinationMapId,
          label: choice.label || mapDisplayName(choice.destinationMapId),
        })
        const res = await teleport({
          characterId: character.id,
          mapId: position.mapId,
          x: position.x,
          y: position.y,
          npcId: npc.id,
          destinationMapId: choice.destinationMapId,
        })
        onCharacterUpdated(res.character)
        emitGameEvent('status', `Warped to ${choice.label}`)
      } catch (err) {
        setMapLoading(null)
        setMessage(err instanceof Error ? err.message : 'Warp failed')
      }
    }
  }

  return (
    <div className={`game-shell ro-layout${skillsOpen ? ' skills-assign-mode' : ''}`}>
      <header className="hud row spread">
        <div>
          <strong>{character.name}</strong>
          <span className="muted">
            {' '}
            · {character.map_id} · {JOB_NAMES[sheet.jobId] ?? sheet.jobId} · Lv {sheet.baseLevel} · Job {sheet.jobLevel} · HP {sheet.hp}/{sheet.hpMax} · MP{' '}
            {sheet.mp}/{sheet.mpMax}
          </span>
        </div>
        <div className="row">
          <button type="button" className="secondary" onClick={() => setStatsOpen(true)}>Stats</button>
          <button type="button" className="secondary" onClick={() => setInventoryOpen(true)}>Inventory</button>
          <button type="button" className="secondary" onClick={() => setEquipmentOpen(true)}>Equip</button>
          <button type="button" className="secondary" onClick={() => setSkillsOpen(true)}>Skills</button>
          <span className="muted">{status}</span>
          <button type="button" className="secondary" onClick={() => void leaveWorld()}>Leave world</button>
        </div>
      </header>

      <div className="game-stage">
        {mapLoading && (
          <MapLoadingOverlay label={mapLoading.label} mapId={mapLoading.mapId} />
        )}
        {!sessionReady && !mapLoading && <p className="muted game-loading">Loading character…</p>}
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
          Click move · Space jump · 1–9 skills · Click NPC · Alt+S/I/E/K windows
        </p>
        {nearbyNpc && (
          <p className="muted small">
            Nearby: <strong>{nearbyNpc.label}</strong> — click them to talk
          </p>
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

      {npcMenu && (
        <NpcOptionsModal
          npc={npcMenu}
          onClose={() => setNpcMenu(null)}
          onChoose={(choice) => void runNpcChoice(npcMenu, choice)}
        />
      )}

      {storageNpc && (
        <StorageModal character={character} npc={storageNpc} position={position} onClose={() => setStorageNpc(null)} />
      )}

      {jobMasterNpc && (
        <JobMasterModal
          character={character}
          npc={jobMasterNpc}
          sheet={sheet}
          onClose={() => setJobMasterNpc(null)}
          onCharacterUpdated={onCharacterUpdated}
        />
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
