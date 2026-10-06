import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Phaser from 'phaser'
import { savePoint, teleport } from '../lib/api'
import {
  loadCharacterSession,
  persistCharacterWorld,
} from '../lib/characterProgress'
import { supabase } from '../lib/supabase'
import { JOB_NAMES } from '../game/character/skillsConfig'
import {
  dispatchCharacterAction,
  registerCharacterActionContext,
} from '../game/character/characterActionDispatch'
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
import { ExperienceHud } from './ExperienceHud'
import { SkillsWindow } from './SkillsWindow'
import { EquipmentWindow } from './EquipmentWindow'
import { InventoryWindow } from './InventoryWindow'
import { StatsWindow } from './StatsWindow'
import { StorageModal } from './StorageModal'
import { JobMasterModal } from './JobMasterModal'
import { ShopModal } from './ShopModal'
import { NpcOptionsModal, type NpcMenuChoice } from './NpcOptionsModal'
import { MapLoadingOverlay } from './MapLoadingOverlay'
import { TradeModal } from './TradeModal'
import { mapDisplayName } from '../game/world/mapDisplayName'
import { hudEnterMotion } from './motion/motionPresets'

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
  const positionRef = useRef(position)
  positionRef.current = position
  const [status, setStatus] = useState('')
  const [storageNpc, setStorageNpc] = useState<NpcRow | null>(null)
  const [jobMasterNpc, setJobMasterNpc] = useState<NpcRow | null>(null)
  const [shopNpc, setShopNpc] = useState<NpcRow | null>(null)
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
  const [logOpen, setLogOpen] = useState(false)

  const modalOpen =
    statsOpen ||
    skillsOpen ||
    inventoryOpen ||
    equipmentOpen ||
    !!storageNpc ||
    !!jobMasterNpc ||
    !!shopNpc ||
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
    emitGameEvent('uiPointerLock', false)
  }, [])

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
    document.body.classList.add('game-active')
    return () => document.body.classList.remove('game-active')
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !npcsReady || !sessionReady) return

    let cancelled = false
    let game: Phaser.Game | null = null
    let rafId = 0

    const refreshScale = () => {
      if (!game || cancelled) return
      game.scale.refresh()
    }

    const startGame = () => {
      if (cancelled) return
      host.replaceChildren()
      game = createPhaserGame(host, character, npcs, sessionRef.current)
      gameRef.current = game
      game.events.once('ready', () => {
        refreshScale()
        requestAnimationFrame(refreshScale)
      })
      queueMicrotask(() => {
        if (!cancelled) {
          emitGameEvent('sessionSync', structuredClone(sessionRef.current))
        }
      })
    }

    rafId = requestAnimationFrame(startGame)

    window.addEventListener('resize', refreshScale)
    const ro = new ResizeObserver(refreshScale)
    ro.observe(host)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', refreshScale)
      game?.destroy(true)
      host.replaceChildren()
      gameRef.current = null
    }
  }, [character.id, character.map_id, npcsReady, npcs, sessionReady])

  useEffect(() => {
    if (!mapLoading) return
    const t = window.setTimeout(() => setMapLoading(null), 12_000)
    return () => window.clearTimeout(t)
  }, [mapLoading])

  async function leaveWorld() {
    try {
      await persistCharacterWorld(character.id, positionRef.current, sessionRef.current)
    } catch (err) {
      console.warn('Failed to save character progress', err)
    }
    onExit()
  }

  useEffect(() => {
    if (!sessionReady) return

    function flushOnHide() {
      if (document.visibilityState !== 'hidden') return
      void persistCharacterWorld(character.id, positionRef.current, sessionRef.current).catch((err) => {
        console.warn('Background save failed', err)
      })
    }

    document.addEventListener('visibilitychange', flushOnHide)
    return () => document.removeEventListener('visibilitychange', flushOnHide)
  }, [sessionReady, character.id])

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
    if (choice.kind === 'shop') {
      setShopNpc(npc)
      return
    }
    if (choice.kind === 'healer') {
      try {
        if (choice.zenyCost > 0) {
          if (character.zeny < choice.zenyCost) {
            setMessage(`Need ${choice.zenyCost} zeny.`)
            return
          }
          const { data, error } = await supabase
            .from('characters')
            .update({ zeny: character.zeny - choice.zenyCost })
            .eq('id', character.id)
            .select('*')
            .single()
          if (error || !data) {
            setMessage(error?.message ?? 'Payment failed')
            return
          }
          onCharacterUpdated(data as CharacterRow)
        }
        dispatchCharacterAction({ type: 'restoreVitals' })
        setMessage('HP and SP fully restored.')
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Heal failed')
      }
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

  const hpRatio = sheet.hpMax > 0 ? Math.min(1, sheet.hp / sheet.hpMax) : 0
  const mpRatio = sheet.mpMax > 0 ? Math.min(1, sheet.mp / sheet.mpMax) : 0

  return (
    <div className={`game-shell game-shell--fullscreen${skillsOpen ? ' skills-assign-mode' : ''}`}>
      <div className="game-stage game-stage--fullscreen" aria-label="Game world">
        <div ref={hostRef} className="game-canvas" />
        <AnimatePresence>
          {mapLoading && (
            <MapLoadingOverlay key={mapLoading.mapId} label={mapLoading.label} mapId={mapLoading.mapId} />
          )}
        </AnimatePresence>
        {!sessionReady && !mapLoading && <p className="muted game-loading">Loading character…</p>}

        <div className="game-hud-overlay" aria-label="Game HUD">
          <motion.div className="game-hud-panel game-hud-vitals" {...hudEnterMotion} transition={{ ...hudEnterMotion.transition, delay: 0.04 }}>
            <p className="game-hud-name">
              <strong>{character.name}</strong>
              <span className="muted small">
                {mapDisplayName(character.map_id)} · {JOB_NAMES[sheet.jobId] ?? sheet.jobId} · Base {sheet.baseLevel} · Job {sheet.jobLevel}
              </span>
            </p>
            <div className="vital-row">
              <span className="vital-label">HP</span>
              <div className="vital-track">
                <motion.div
                  className="vital-fill vital-fill--hp"
                  initial={false}
                  animate={{ width: `${hpRatio * 100}%` }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              </div>
              <span className="vital-num">{sheet.hp}/{sheet.hpMax}</span>
            </div>
            <div className="vital-row">
              <span className="vital-label">SP</span>
              <div className="vital-track">
                <motion.div
                  className="vital-fill vital-fill--mp"
                  initial={false}
                  animate={{ width: `${mpRatio * 100}%` }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                />
              </div>
              <span className="vital-num">{sheet.mp}/{sheet.mpMax}</span>
            </div>
            <p className="game-hud-zeny">
              Zeny <strong>{character.zeny.toLocaleString()}</strong>
            </p>
          </motion.div>

          <motion.div
            className="game-hud-panel game-hud-menu row"
            {...hudEnterMotion}
            transition={{ ...hudEnterMotion.transition, delay: 0.08 }}
          >
            <button type="button" className="secondary hud-btn" onClick={() => setStatsOpen(true)} title="Alt+S">
              Stats
            </button>
            <button type="button" className="secondary hud-btn" onClick={() => setInventoryOpen(true)} title="Alt+I">
              Inv
            </button>
            <button type="button" className="secondary hud-btn" onClick={() => setEquipmentOpen(true)} title="Alt+E">
              Equip
            </button>
            <button type="button" className="secondary hud-btn" onClick={() => setSkillsOpen(true)} title="Alt+K">
              Skills
            </button>
            {status && <span className="hud-status muted small">{status}</span>}
            <button type="button" className="secondary hud-btn hud-btn--leave" onClick={() => void leaveWorld()}>
              Leave
            </button>
          </motion.div>

          <motion.div
            className="game-hud-panel game-hud-target"
            {...hudEnterMotion}
            transition={{ ...hudEnterMotion.transition, delay: 0.12 }}
          >
            <h3>Target</h3>
            {selectedMob ? (
              <div className="target-panel">
                <p><strong>{selectedMob.name}</strong></p>
                <p className="muted small">Lv {selectedMob.level}</p>
                <p className="small">HP {selectedMob.hp} / {selectedMob.hpMax}</p>
              </div>
            ) : (
              <p className="muted small">Click a mob</p>
            )}
          </motion.div>

          <motion.div
            className="game-hud-panel game-hud-nearby"
            {...hudEnterMotion}
            transition={{ ...hudEnterMotion.transition, delay: 0.16 }}
          >
            <h3>Nearby</h3>
            <ul className="item-list">
              {remotePlayers.map((p) => (
                <li key={p.characterId} className="row spread">
                  <span className="small">{p.name}</span>
                  <button type="button" className="hud-btn" onClick={() => setTradePartner({ characterId: p.characterId, name: p.name })}>
                    Trade
                  </button>
                </li>
              ))}
              {remotePlayers.length === 0 && <li className="muted small">Alone on map</li>}
            </ul>
            {nearbyNpc && (
              <p className="muted small">
                NPC: <strong>{nearbyNpc.label}</strong>
              </p>
            )}
            {message && <p className="small">{message}</p>}
          </motion.div>

          <motion.div
            className="game-hud-bottom"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30, delay: 0.2 }}
          >
            <div className="game-hud-log-row">
              <button
                type="button"
                className="secondary hud-btn hud-log-toggle"
                onClick={() => setLogOpen((o) => !o)}
              >
                {logOpen ? 'Hide log' : 'Log'}
              </button>
              <AnimatePresence>
                {logOpen && (
                  <motion.div
                    key="activity-log"
                    className="activity-log-motion-wrap"
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 6, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ActivityLog entries={activityLog} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="game-bottom-dock">
              <SkillBar sheet={sheet} />
              <ExperienceHud sheet={sheet} />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {statsOpen && <StatsWindow key="stats" sheet={sheet} onClose={() => setStatsOpen(false)} />}
        {inventoryOpen && (
          <InventoryWindow
            key="inventory"
            characterId={character.id}
            sheet={sheet}
            onClose={() => setInventoryOpen(false)}
          />
        )}
        {equipmentOpen && (
          <EquipmentWindow key="equipment" sheet={sheet} onClose={() => setEquipmentOpen(false)} />
        )}
        {skillsOpen && <SkillsWindow key="skills" sheet={sheet} onClose={() => setSkillsOpen(false)} />}
        {npcMenu && (
          <NpcOptionsModal
            key={`npc-${npcMenu.id}`}
            npc={npcMenu}
            onClose={() => setNpcMenu(null)}
            onChoose={(choice) => void runNpcChoice(npcMenu, choice)}
          />
        )}
        {storageNpc && (
          <StorageModal
            key={`storage-${storageNpc.id}`}
            character={character}
            npc={storageNpc}
            position={position}
            onClose={() => setStorageNpc(null)}
          />
        )}
        {jobMasterNpc && (
          <JobMasterModal
            key={`job-${jobMasterNpc.id}`}
            character={character}
            npc={jobMasterNpc}
            sheet={sheet}
            onClose={() => setJobMasterNpc(null)}
            onCharacterUpdated={onCharacterUpdated}
          />
        )}
        {shopNpc && (
          <ShopModal
            key={`shop-${shopNpc.id}`}
            character={character}
            npc={shopNpc}
            sheet={sheet}
            onClose={() => setShopNpc(null)}
            onCharacterUpdated={onCharacterUpdated}
          />
        )}
        {tradePartner && (
          <TradeModal
            key={`trade-${tradePartner.characterId}`}
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
      </AnimatePresence>
    </div>
  )
}
