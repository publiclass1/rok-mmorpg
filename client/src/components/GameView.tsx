import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Phaser from 'phaser'
import { duelManage, dungeonManage, gmCommand, partyManage, portalWarp, savePoint, teleport } from '../lib/api'
import { clearCharacterPresence, upsertCharacterPresence } from '../lib/characterPresence'
import { loadGuildForCharacter, type GuildSnapshot } from '../lib/guildState'
import { loadPartyForCharacter, type PartySnapshot } from '../lib/partyState'
import { flushActiveMapPresenceLeave } from '../game/realtime/activeMapPresence'
import { MapChatChannel, type ChatMessage } from '../game/realtime/mapChat'
import { PartyRealtimeChannel } from '../game/realtime/partyChannel'
import { loadAccountSavePoint } from '../lib/accountSavePoint'
import { PRONTERA_TOWN_SPAWN } from '../lib/pronteraSpawn'
import {
  loadCharacterSession,
  persistCharacterWorld,
  saveCharacterSession,
  saveCharacterWorldPosition,
} from '../lib/characterProgress'
import { supabase } from '../lib/supabase'
import { spendCharacterZeny } from '../lib/zeny'
import { appearanceFromCharacterRow, appearanceKey } from '../game/character/characterAppearance'
import { JOB_NAMES } from '../game/character/skillsConfig'
import {
  dispatchCharacterAction,
  registerCharacterActionContext,
} from '../game/character/characterActionDispatch'
import {
  getCharacterSession,
  registerCharacterSessionBridge,
} from '../game/character/characterSessionBridge'
import { mergeSheetIntoSession, toCharacterSheetPayload } from '../game/character/characterSheet'
import { setCharacterSession } from '../game/character/characterSessionBridge'
import { createInitialCharacterState } from '../game/character/characterState'
import { isChatStripInputFocused } from '../game/chatInputFocus'
import { createPhaserGame } from '../game/createGame'
import {
  emitGameEvent,
  onGameEvent,
  type CharacterSheetPayload,
  type ActivityLogEntry,
  type SelectedMobPayload,
  type SelectedPlayerPayload,
  type PlayerBuffPayload,
  type DungeonSyncPayload,
  type DuelSyncPayload,
  type GameEvents,
} from '../game/events'
import { duelRowToSyncPayload } from '../game/duel/duelSync'
import type {
  CharacterRow,
  DungeonInstanceRow,
  NpcRow,
  DuelSessionRow,
  PartyRequestRow,
  TradeSessionRow,
} from '../types/database'
import type { BootDungeonState } from '../game/world/bootDungeon'
import { dungeonFloors, isDungeonMapId } from '../game/world/dungeonConfig'
import { ChatStrip, type ChatStripHandle } from './ChatStrip'
import { PlayerTargetPopup } from './PlayerTargetPopup'
import { GuildModal } from './GuildModal'
import { DuelCountdownOverlay } from './DuelCountdownOverlay'
import { DuelInviteModal } from './DuelInviteModal'
import { PartyRequestModal } from './PartyRequestModal'
import { PartyWindow } from './PartyWindow'
import { VendorSetupModal } from './VendorSetupModal'
import { VendorShopModal } from './VendorShopModal'
import { BuffBar } from './BuffBar'
import { SkillBar } from './SkillBar'
import { ExperienceHud } from './ExperienceHud'
import { SkillsWindow } from './SkillsWindow'
import { EquipmentWindow } from './EquipmentWindow'
import { InventoryWindow } from './InventoryWindow'
import { StatsWindow } from './StatsWindow'
import { StorageModal } from './StorageModal'
import { LowHpVignette } from './LowHpVignette'
import { PlayerHudPortrait } from './PlayerHudPortrait'
import { Minimap } from './Minimap'
import type { MinimapPayload } from '../game/world/minimapTypes'
import { JobMasterModal } from './JobMasterModal'
import { RentalModal } from './RentalModal'
import { ShopModal } from './ShopModal'
import { RarityTabShopModal } from './RarityTabShopModal'
import { isRarityTabShop } from '../game/character/npcServices'
import { NpcOptionsModal, type NpcMenuChoice } from './NpcOptionsModal'
import { DeathModal } from './DeathModal'
import { PvpDeathModal } from './PvpDeathModal'
import { preloadKillStreakAudio } from '../game/combat/killStreakAudio'
import { PvpKillAnnounceOverlay } from './PvpKillAnnounceOverlay'
import { isPvpMap, PVP_ROOM_EXIT_TELEPORT, randomPvpRespawnPoint } from '../game/world/pvpConfig'
import { SplashScreen } from './SplashScreen'
import { TradeModal } from './TradeModal'
import { mapDisplayName } from '../game/world/mapDisplayName'
import { hudEnterMotion } from './motion/motionPresets'
import { buildItemTooltipDetail } from '../game/character/itemTooltipDetail'
import { ItemDetailTooltip } from './ItemDetailTooltip'
import { FloatingTooltipPortal } from './tooltip/FloatingTooltipPortal'
import { floatingTooltipPositionFromPoint } from './tooltip/floatingTooltipPosition'
import { GameHudMenu, type GameHudMenuItem } from './GameHudMenu'

type Props = {
  character: CharacterRow
  onCharacterUpdated: (character: CharacterRow) => void
  onExit: () => void
}

function dungeonInstanceToSync(row: DungeonInstanceRow): DungeonSyncPayload {
  return {
    instanceId: row.id,
    floorId: row.floor_id,
    mapId: row.map_id,
    killedSpawns: row.killed_spawns ?? [],
    mvpAlive: row.mvp_alive,
    status: row.status,
  }
}

export function GameView({ character, onCharacterUpdated, onExit }: Props) {
  const shellRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [npcs, setNpcs] = useState<NpcRow[]>([])
  const [npcsReady, setNpcsReady] = useState(false)
  const [nearbyNpc, setNearbyNpc] = useState<NpcRow | null>(null)
  const [position, setPosition] = useState({ x: character.x, y: character.y, mapId: character.map_id })
  const positionRef = useRef(position)
  positionRef.current = position
  const characterRef = useRef(character)
  characterRef.current = character

  useEffect(() => {
    setPosition((prev) =>
      prev.mapId === character.map_id ? prev : { ...prev, mapId: character.map_id },
    )
  }, [character.map_id])

  const pendingZenySaveRef = useRef(0)
  const zenySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const destroyActiveGame = useCallback(() => {
    const game = gameRef.current
    if (!game) return
    game.destroy(true)
    gameRef.current = null
    hostRef.current?.replaceChildren()
  }, [])

  const tearDownGameForMapChange = useCallback(async () => {
    await flushActiveMapPresenceLeave()
    destroyActiveGame()
  }, [destroyActiveGame])

  const flushZenyToDb = useCallback(async () => {
    pendingZenySaveRef.current = 0
  }, [])
  const [status, setStatus] = useState('')
  const statusFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const STATUS_FADE_MS = 5000

  const showStatusMessage = useCallback((message: string) => {
    if (statusFadeTimerRef.current) clearTimeout(statusFadeTimerRef.current)
    setStatus(message)
    if (!message) return
    statusFadeTimerRef.current = setTimeout(() => {
      setStatus('')
      statusFadeTimerRef.current = null
    }, STATUS_FADE_MS)
  }, [])
  const [storageNpc, setStorageNpc] = useState<NpcRow | null>(null)
  const [jobMasterNpc, setJobMasterNpc] = useState<NpcRow | null>(null)
  const [shopNpc, setShopNpc] = useState<NpcRow | null>(null)
  const [rentalNpc, setRentalNpc] = useState<NpcRow | null>(null)
  const [npcMenu, setNpcMenu] = useState<NpcRow | null>(null)
  const [remotePlayers, setRemotePlayers] = useState<
    Array<{
      characterId: string
      name: string
      x: number
      y: number
      isVending?: boolean
      stallTitle?: string | null
    }>
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
  const [playerBuffs, setPlayerBuffs] = useState<PlayerBuffPayload[]>([])
  const [mapLoading, setMapLoading] = useState<{ mapId: string; label: string } | null>(null)
  const mapLoadingRef = useRef(mapLoading)
  mapLoadingRef.current = mapLoading
  const [loadProgress, setLoadProgress] = useState<number | undefined>(undefined)
  const [deathModalOpen, setDeathModalOpen] = useState(false)
  const [pvpDeathModalOpen, setPvpDeathModalOpen] = useState(false)
  const [deathSaveMapId, setDeathSaveMapId] = useState('prontera')
  const [pvpAnnounce, setPvpAnnounce] = useState<GameEvents['pvpAnnounce'] | null>(null)
  const [pvpKillCount, setPvpKillCount] = useState(0)
  const [minimap, setMinimap] = useState<MinimapPayload | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayerPayload | null>(null)
  const [selectedPlayerAnchor, setSelectedPlayerAnchor] = useState<{ x: number; y: number } | null>(null)
  const [mapDropHover, setMapDropHover] = useState<GameEvents['mapDropHover']>(null)
  const [partySnapshot, setPartySnapshot] = useState<PartySnapshot>(null)
  const [guildSnapshot, setGuildSnapshot] = useState<GuildSnapshot>(null)
  const [partyRequest, setPartyRequest] = useState<{ request: PartyRequestRow; fromName: string } | null>(
    null,
  )
  const [duelInvite, setDuelInvite] = useState<DuelSessionRow | null>(null)
  const [duelSync, setDuelSync] = useState<DuelSyncPayload | null>(null)
  const duelSyncRef = useRef<DuelSyncPayload | null>(null)
  duelSyncRef.current = duelSync
  const [guildOpen, setGuildOpen] = useState(false)
  const [partyOpen, setPartyOpen] = useState(false)
  const [vendorSetupOpen, setVendorSetupOpen] = useState(false)
  const [vendorShopTarget, setVendorShopTarget] = useState<SelectedPlayerPayload | null>(null)
  const [vendingOpen, setVendingOpen] = useState(false)
  const [stallTitle, setStallTitle] = useState('Shop')
  const [mapChatLines, setMapChatLines] = useState<ChatMessage[]>([])
  const [partyChatLines, setPartyChatLines] = useState<ChatMessage[]>([])
  const mapChatRef = useRef<MapChatChannel | null>(null)
  const chatStripRef = useRef<ChatStripHandle>(null)
  const partyChannelRef = useRef<PartyRealtimeChannel | null>(null)
  const [bootDungeon, setBootDungeon] = useState<BootDungeonState | null>(null)
  const [dungeonReady, setDungeonReady] = useState(true)

  const modalOpen =
    statsOpen ||
    skillsOpen ||
    inventoryOpen ||
    equipmentOpen ||
    deathModalOpen ||
    pvpDeathModalOpen ||
    !!storageNpc ||
    !!jobMasterNpc ||
    !!shopNpc ||
    !!rentalNpc ||
    !!npcMenu ||
    !!tradePartner ||
    !!partyRequest ||
    !!duelInvite ||
    partyOpen ||
    guildOpen ||
    vendorSetupOpen ||
    !!vendorShopTarget

  const refreshParty = () => {
    void loadPartyForCharacter(character.id)
      .then(setPartySnapshot)
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Could not load party'))
  }

  useEffect(() => {
    if (!partyOpen) return
    refreshParty()
  }, [partyOpen, character.id])

  const refreshGuild = () => {
    void loadGuildForCharacter(character.id).then(setGuildSnapshot)
  }

  useEffect(() => {
    setSessionReady(false)
    let cancelled = false
    void loadCharacterSession(character.id).then((loaded) => {
      if (cancelled) return
      setCharacterSession(loaded)
      setSheet(toCharacterSheetPayload(getCharacterSession()))
      setSessionReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [character.id])

  useEffect(() => {
    if (!isDungeonMapId(character.map_id)) {
      setBootDungeon(null)
      setDungeonReady(true)
      return
    }

    setDungeonReady(false)
    const partyId = partySnapshot?.party.id
    if (!partyId) {
      void supabase
        .from('characters')
        .update({
          map_id: 'prontera',
          x: PRONTERA_TOWN_SPAWN.x,
          y: PRONTERA_TOWN_SPAWN.y,
        })
        .eq('id', character.id)
        .select('*')
        .single()
        .then(({ data }) => {
          if (data) {
            onCharacterUpdated(data as CharacterRow)
            setMessage('Left the dungeon — you must be in a party.')
          }
          setDungeonReady(true)
        })
      return
    }

    void supabase
      .from('dungeon_instances')
      .select('*')
      .eq('party_id', partyId)
      .eq('map_id', character.map_id)
      .neq('status', 'cleared')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          void supabase
            .from('characters')
            .update({
              map_id: 'prontera',
              x: PRONTERA_TOWN_SPAWN.x,
              y: PRONTERA_TOWN_SPAWN.y,
            })
            .eq('id', character.id)
            .select('*')
            .single()
            .then(({ data: char }) => {
              if (char) onCharacterUpdated(char as CharacterRow)
              setMessage('No active dungeon instance for your party.')
            })
          setBootDungeon(null)
        } else {
          setBootDungeon(dungeonInstanceToSync(data as DungeonInstanceRow))
        }
        setDungeonReady(true)
      })
  }, [character.id, character.map_id, partySnapshot?.party.id, onCharacterUpdated])

  useEffect(() => {
    if (!bootDungeon?.instanceId) return
    const channel = supabase
      .channel(`dungeon-instance:${bootDungeon.instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dungeon_instances',
          filter: `id=eq.${bootDungeon.instanceId}`,
        },
        (payload) => {
          const row = payload.new as DungeonInstanceRow
          if (!row?.id) return
          const sync = dungeonInstanceToSync(row)
          setBootDungeon(sync)
          emitGameEvent('dungeonSync', sync)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [bootDungeon?.instanceId])

  useEffect(() => {
    const unsubKill = onGameEvent('dungeonMobKilled', ({ instanceId, spawnIndex }) => {
      void dungeonManage({
        action: 'report_kill',
        characterId: character.id,
        instanceId,
        spawnIndex,
      }).then((res) => {
        if (res.instance) {
          const sync = dungeonInstanceToSync(res.instance)
          setBootDungeon(sync)
          emitGameEvent('dungeonSync', sync)
        }
      })
    })
    const unsubMvp = onGameEvent('dungeonMvpKilled', ({ instanceId }) => {
      void dungeonManage({
        action: 'report_mvp_kill',
        characterId: character.id,
        instanceId,
      }).then((res) => {
        if (res.instance) {
          const sync = dungeonInstanceToSync(res.instance)
          setBootDungeon(sync)
          emitGameEvent('dungeonSync', sync)
        }
      })
    })
    return () => {
      unsubKill()
      unsubMvp()
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
    refreshParty()
    refreshGuild()
    void supabase
      .from('vendor_stalls')
      .select('*')
      .eq('character_id', character.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_open) {
          setVendingOpen(true)
          setStallTitle(data.title)
        }
      })
  }, [character.id])

  useEffect(() => {
    emitGameEvent('socialPresence', {
      guildTag: guildSnapshot?.guild.tag ?? null,
      isVending: vendingOpen,
      stallTitle: vendingOpen ? stallTitle : null,
    })
  }, [guildSnapshot, vendingOpen, stallTitle])

  useEffect(() => {
    emitGameEvent('partySync', {
      partyId: partySnapshot?.party.id ?? null,
      leaderCharacterId: partySnapshot?.party.leader_character_id ?? null,
      expShare: partySnapshot?.party.exp_share ?? false,
      memberCharacterIds: partySnapshot?.members.map((m) => m.characterId) ?? [],
      myCharacterId: character.id,
    })
  }, [partySnapshot, character.id])

  useEffect(() => {
    if (!vendingOpen) return
    const tick = () => {
      const pos = positionRef.current
      emitGameEvent('vendorPosSync', { mapId: pos.mapId, x: pos.x, y: pos.y })
    }
    tick()
    const interval = window.setInterval(tick, 3000)
    return () => window.clearInterval(interval)
  }, [vendingOpen, character.id])

  useEffect(() => {
    const channel = supabase
      .channel(`party-requests:${character.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'party_requests' },
        async (payload) => {
          const row = payload.new as PartyRequestRow
          if (row.to_character_id !== character.id || row.status !== 'pending') return
          const { data } = await supabase
            .from('characters')
            .select('name')
            .eq('id', row.from_character_id)
            .single()
          setPartyRequest({ request: row, fromName: data?.name ?? 'Adventurer' })
        },
      )
      .subscribe()

    const partyMemberSub = supabase
      .channel(`party-roster:${character.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_members' },
        () => refreshParty(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, () => refreshParty())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
      void supabase.removeChannel(partyMemberSub)
    }
  }, [character.id])

  const restoreVitalsAfterDuel = useCallback(() => {
    const session = getCharacterSession()
    const payload = toCharacterSheetPayload(session)
    const next = { ...session, hp: payload.hpMax, mp: payload.mpMax }
    sessionRef.current = next
    setSheet(toCharacterSheetPayload(next))
    emitGameEvent('sessionSync', structuredClone(next))
  }, [])

  const applyDuelSessionRow = useCallback(
    (row: DuelSessionRow) => {
      const myId = characterRef.current.id
      const isParticipant =
        row.challenger_character_id === myId || row.opponent_character_id === myId
      if (!isParticipant) return

      if (row.state === 'pending' && row.opponent_character_id === myId) {
        setDuelInvite(row)
        return
      }

      if (row.state === 'pending' && row.challenger_character_id === myId) {
        setDuelInvite(null)
        return
      }

      if (row.state === 'declined' || row.state === 'cancelled') {
        setDuelInvite((cur) => (cur?.id === row.id ? null : cur))
        if (duelSyncRef.current?.duelSessionId === row.id) {
          setDuelSync(null)
          emitGameEvent('duelSync', null)
        }
        return
      }

      if (row.state === 'completed') {
        setDuelInvite(null)
        setDuelSync(null)
        emitGameEvent('duelSync', null)
        restoreVitalsAfterDuel()
        if (row.winner_character_id === myId) {
          setMessage('You won the duel!')
        } else if (row.winner_character_id) {
          setMessage('You lost the duel.')
        }
        return
      }

      if (row.state === 'countdown' || row.state === 'active') {
        const sync = duelRowToSyncPayload(row, myId)
        if (sync) {
          setDuelInvite(null)
          setDuelSync(sync)
          emitGameEvent('duelSync', sync)
        }
        const myHp =
          row.challenger_character_id === myId ? row.challenger_hp : row.opponent_hp
        if (myHp != null) {
          emitGameEvent('duelHpSync', { hp: myHp })
        }
      }
    },
    [restoreVitalsAfterDuel],
  )

  useEffect(() => {
    void supabase
      .from('duel_sessions')
      .select('*')
      .or(`challenger_character_id.eq.${character.id},opponent_character_id.eq.${character.id}`)
      .in('state', ['pending', 'countdown', 'active'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) applyDuelSessionRow(data)
      })

    const channel = supabase
      .channel(`duel-sessions:${character.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'duel_sessions' },
        (payload) => {
          applyDuelSessionRow(payload.new as DuelSessionRow)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duel_sessions' },
        (payload) => {
          applyDuelSessionRow(payload.new as DuelSessionRow)
        },
      )
      .subscribe()

    return () => {
      emitGameEvent('duelSync', null)
      void supabase.removeChannel(channel)
    }
  }, [character.id, applyDuelSessionRow])

  useEffect(() => {
    let chat: MapChatChannel | null = new MapChatChannel(character.map_id, (msg) => {
      setMapChatLines((prev) => [...prev, msg].slice(-50))
      if (msg.characterId !== characterRef.current.id) {
        showOverheadChat(msg.characterId, msg.text)
      }
    })
    mapChatRef.current = chat
    void chat.join()
    return () => {
      void chat?.leave()
      mapChatRef.current = null
    }
  }, [character.map_id])

  useEffect(() => {
    const partyId = partySnapshot?.party.id
    if (!partyId) {
      void partyChannelRef.current?.leave()
      partyChannelRef.current = null
      return
    }
    const ch = new PartyRealtimeChannel(
      partyId,
      (msg) => setPartyChatLines((prev) => [...prev, msg].slice(-50)),
      (grant) => emitGameEvent('partyExpGrant', grant),
    )
    partyChannelRef.current = ch
    void ch.join()
    return () => {
      void ch.leave()
      if (partyChannelRef.current === ch) partyChannelRef.current = null
    }
  }, [partySnapshot?.party.id])

  useEffect(() => {
    const unsub = onGameEvent('partyExpBroadcast', (payload) => {
      partyChannelRef.current?.broadcastExpGrant(payload)
    })
    return () => {
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!gameRef.current) return
    emitGameEvent('uiPointerLock', modalOpen)
  }, [modalOpen])

  useEffect(() => {
    preloadKillStreakAudio()
  }, [])

  useEffect(() => {
    if (!isPvpMap(character.map_id)) {
      setPvpKillCount(0)
    }
  }, [character.map_id])

  useEffect(() => {
    if (!statsOpen && !skillsOpen) return
    setSheet(toCharacterSheetPayload(getCharacterSession()))
  }, [statsOpen, skillsOpen])

  useEffect(() => {
    const setSession = (state: typeof sessionRef.current) => {
      sessionRef.current = state
    }
    registerCharacterSessionBridge({
      get: () => sessionRef.current,
      set: setSession,
    })
    registerCharacterActionContext({
      getSession: () => sessionRef.current,
      setSession,
      setSheet,
      persistSession: (state) => {
        void saveCharacterSession(character.id, state).catch((err) => {
          console.warn('Progress save failed', err)
          emitGameEvent('status', 'Could not save progress — skill bar and stats may not persist.')
        })
      },
    })
    return () => {
      registerCharacterSessionBridge(null)
      registerCharacterActionContext(null)
    }
  }, [character.id])

  useEffect(() => {
    const unsubGain = onGameEvent('zenyGain', ({ amount }) => {
      if (amount <= 0) return
      const updated: CharacterRow = {
        ...characterRef.current,
        zeny: characterRef.current.zeny + amount,
      }
      characterRef.current = updated
      onCharacterUpdated(updated)
      pendingZenySaveRef.current += amount
      if (zenySaveTimerRef.current) clearTimeout(zenySaveTimerRef.current)
      zenySaveTimerRef.current = setTimeout(() => {
        void flushZenyToDb()
      }, 1500)
    })
    const unsubSync = onGameEvent('characterZenySync', ({ zeny }) => {
      const updated: CharacterRow = { ...characterRef.current, zeny }
      characterRef.current = updated
      onCharacterUpdated(updated)
      pendingZenySaveRef.current = 0
    })
    return () => {
      unsubGain()
      unsubSync()
    }
  }, [onCharacterUpdated, flushZenyToDb])

  useEffect(() => {
    const unsubs = [
      onGameEvent('npcNearby', setNearbyNpc),
      onGameEvent('npcInteract', (npc) => setNpcMenu(npc)),
      onGameEvent('position', ({ x, y }) => {
        setPosition((prev) => ({ ...prev, x, y }))
      }),
      onGameEvent('status', showStatusMessage),
      onGameEvent('remotePlayers', setRemotePlayers),
      onGameEvent('characterSheet', (payload) => {
        const ref = sessionRef.current
        if (payload.jobId !== ref.jobId) {
          const merged = mergeSheetIntoSession(payload, ref)
          merged.jobId = ref.jobId
          setCharacterSession(merged)
          setSheet(toCharacterSheetPayload(getCharacterSession()))
          emitGameEvent('sessionSync', structuredClone(getCharacterSession()))
          return
        }
        setCharacterSession(mergeSheetIntoSession(payload, ref))
        setSheet(toCharacterSheetPayload(getCharacterSession()))
        if (isPvpMap(characterRef.current.map_id) && payload.hp > 0) {
          setPvpDeathModalOpen(false)
        }
      }),
      onGameEvent('playerStats', (p) => {
        setSheet((s) => ({ ...s, ...p }))
      }),
      onGameEvent('playerBuffs', setPlayerBuffs),
      onGameEvent('selectedMob', (mob) => {
        setSelectedMob(mob)
        if (mob) setSelectedPlayer(null)
      }),
      onGameEvent('selectedPlayer', (player) => {
        setSelectedPlayer(player)
        if (!player) setSelectedPlayerAnchor(null)
      }),
      onGameEvent('selectedPlayerAnchor', setSelectedPlayerAnchor),
      onGameEvent('mapDropHover', setMapDropHover),
      onGameEvent('activityLog', (entry) => {
        setActivityLog((prev) => [...prev, entry].slice(-100))
      }),
      onGameEvent('worldReady', ({ mapId }) => {
        setMapLoading((current) => (current?.mapId === mapId ? null : current))
        setLoadProgress(undefined)
      }),
      onGameEvent('worldLoadProgress', ({ mapId, progress }) => {
        setLoadProgress((prev) => {
          const activeMapId = mapLoadingRef.current?.mapId ?? characterRef.current.map_id
          if (mapId !== activeMapId) return prev
          return progress
        })
      }),
      onGameEvent('minimap', setMinimap),
      onGameEvent('playerDeath', () => {
        void loadAccountSavePoint().then((save) => {
          setDeathSaveMapId(save.mapId)
          setDeathModalOpen(true)
        })
      }),
      onGameEvent('pvpDeath', () => {
        if (getCharacterSession().hp <= 0) {
          setPvpDeathModalOpen(true)
        }
      }),
      onGameEvent('pvpRespawned', () => {
        setPvpDeathModalOpen(false)
        setSheet(toCharacterSheetPayload(getCharacterSession()))
      }),
      onGameEvent('pvpAnnounce', (payload) => {
        setPvpAnnounce(payload)
        if (payload.killerCharacterId === characterRef.current.id) {
          setPvpKillCount((n) => n + 1)
        }
      }),
      onGameEvent('duelCompleteRequest', ({ duelSessionId, winnerCharacterId }) => {
        void duelManage({
          action: 'complete',
          characterId: characterRef.current.id,
          duelSessionId,
          winnerCharacterId,
        }).catch((err) => {
          setMessage(err instanceof Error ? err.message : 'Could not end duel')
        })
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [showStatusMessage])

  useEffect(() => {
    return () => {
      if (statusFadeTimerRef.current) clearTimeout(statusFadeTimerRef.current)
    }
  }, [])

  async function returnToSavePoint() {
    const save = await loadAccountSavePoint()
    const sameMap = save.mapId === characterRef.current.map_id
    if (!sameMap) {
      setMapLoading({
        mapId: save.mapId,
        label: mapDisplayName(save.mapId),
      })
    }
    const { data, error } = await supabase
      .from('characters')
      .update({
        map_id: save.mapId,
        x: save.x,
        y: save.y,
      })
      .eq('id', characterRef.current.id)
      .select('*')
      .single()
    if (error || !data) {
      if (!sameMap) setMapLoading(null)
      throw new Error(error?.message ?? 'Respawn failed')
    }
    setPosition({ x: save.x, y: save.y, mapId: save.mapId })
    if (!sameMap) await tearDownGameForMapChange()
    onCharacterUpdated(data as CharacterRow)
    dispatchCharacterAction({ type: 'respawnPartial' })
    if (sameMap) {
      emitGameEvent('playerRevived', { x: save.x, y: save.y })
    }
    setDeathModalOpen(false)
    setMessage('Returned to save point with partial HP and SP.')
  }

  async function respawnInPvpArena() {
    setPvpDeathModalOpen(false)
    const coords = randomPvpRespawnPoint()
    emitGameEvent('pvpRespawnInArena', coords)
    setSheet(toCharacterSheetPayload(getCharacterSession()))
    try {
      const ch = characterRef.current
      await saveCharacterWorldPosition(
        ch.id,
        { x: coords.x, y: coords.y, mapId: ch.map_id },
        { x: ch.x, y: ch.y, mapId: ch.map_id },
      )
      const { data, error } = await supabase
        .from('characters')
        .update({ x: coords.x, y: coords.y })
        .eq('id', characterRef.current.id)
        .select('*')
        .single()
      if (error || !data) throw new Error(error?.message ?? 'Respawn failed')
      onCharacterUpdated(data as CharacterRow)
      setPosition({ x: coords.x, y: coords.y, mapId: characterRef.current.map_id })
      setMessage('Respawned in the PVP arena with full HP and SP.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save respawn position'
      setMessage(msg)
      throw err
    }
  }

  async function leavePvpRoom() {
    setPvpDeathModalOpen(false)
    try {
      const exit = PVP_ROOM_EXIT_TELEPORT
      setMapLoading({ mapId: exit.destinationMapId, label: mapDisplayName(exit.destinationMapId) })
      const res = await teleport({
        characterId: characterRef.current.id,
        mapId: exit.mapId,
        x: exit.npcX,
        y: exit.npcY,
        npcId: exit.npcId,
        destinationMapId: exit.destinationMapId,
      })
      dispatchCharacterAction({ type: 'respawnPartial' })
      await tearDownGameForMapChange()
      setPosition({ x: res.character.x, y: res.character.y, mapId: res.character.map_id })
      onCharacterUpdated(res.character)
      setMessage(`Left PVP room — warped to ${mapDisplayName(exit.destinationMapId)}.`)
    } catch (err) {
      setMapLoading(null)
      setPvpDeathModalOpen(true)
      throw err
    }
  }

  useEffect(() => {
    const unsub = onGameEvent('portalWarpRequest', (payload) => {
      void (async () => {
        try {
          setMapLoading({
            mapId: payload.destinationMapId,
            label: payload.label || mapDisplayName(payload.destinationMapId),
          })
          const res = await portalWarp({
            characterId: character.id,
            mapId: payload.mapId,
            x: payload.x,
            y: payload.y,
            portalId: payload.portalId,
          })
          await tearDownGameForMapChange()
          setPosition({ x: res.character.x, y: res.character.y, mapId: res.character.map_id })
          onCharacterUpdated(res.character)
          emitGameEvent('status', `Warped to ${payload.label}`)
        } catch (err) {
          setMapLoading(null)
          setMessage(err instanceof Error ? err.message : 'Portal warp failed')
        }
      })()
    })
    return () => {
      unsub()
    }
  }, [character.id, onCharacterUpdated, tearDownGameForMapChange])

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
    function syncChatKeyboardLock() {
      emitGameEvent('uiKeyboardLock', isChatStripInputFocused())
    }
    function onFocusOut() {
      requestAnimationFrame(syncChatKeyboardLock)
    }
    document.addEventListener('focusin', syncChatKeyboardLock)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', syncChatKeyboardLock)
      document.removeEventListener('focusout', onFocusOut)
      emitGameEvent('uiKeyboardLock', false)
    }
  }, [])

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener('contextmenu', block)
    return () => el.removeEventListener('contextmenu', block)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !npcsReady || !sessionReady || !dungeonReady) return

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
      game = createPhaserGame(host, character, npcs, sessionRef.current, bootDungeon)
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
  }, [character.id, character.map_id, npcsReady, npcs, sessionReady, dungeonReady, bootDungeon])

  useEffect(() => {
    if (!mapLoading) return
    const t = window.setTimeout(() => setMapLoading(null), 12_000)
    return () => window.clearTimeout(t)
  }, [mapLoading])

  useEffect(() => {
    setLoadProgress(undefined)
  }, [mapLoading?.mapId, character.map_id])

  async function leaveWorld() {
    if (zenySaveTimerRef.current) clearTimeout(zenySaveTimerRef.current)
    await clearCharacterPresence(character.id)
    await flushZenyToDb()
    try {
      const ch = characterRef.current
      await persistCharacterWorld(
        character.id,
        positionRef.current,
        sessionRef.current,
        { x: ch.x, y: ch.y, mapId: ch.map_id },
      )
    } catch (err) {
      console.warn('Failed to save character progress', err)
    }
    onExit()
  }

  useEffect(() => {
    if (!sessionReady) return

    function flushOnHide() {
      if (document.visibilityState !== 'hidden') return
      void flushZenyToDb()
      const ch = characterRef.current
      void persistCharacterWorld(
        character.id,
        positionRef.current,
        sessionRef.current,
        { x: ch.x, y: ch.y, mapId: ch.map_id },
      ).catch((err) => {
        console.warn('Background save failed', err)
      })
    }

    document.addEventListener('visibilitychange', flushOnHide)
    return () => document.removeEventListener('visibilitychange', flushOnHide)
  }, [sessionReady, character.id, flushZenyToDb])

  useEffect(() => {
    if (!sessionReady) return
    const id = character.id
    const interval = window.setInterval(() => {
      void upsertCharacterPresence(
        characterRef.current.id,
        positionRef.current.mapId,
        characterRef.current.name,
      )
    }, 15_000)
    return () => {
      window.clearInterval(interval)
      void clearCharacterPresence(id)
    }
  }, [sessionReady, character.id])

  useEffect(() => {
    if (!sessionReady) return
    void upsertCharacterPresence(character.id, position.mapId, character.name)
  }, [sessionReady, character.id, character.name, position.mapId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const active = document.activeElement
      const chatFocused = isChatStripInputFocused()

      if (e.key === 'Enter' && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (modalOpen) return
        if (chatFocused) {
          e.preventDefault()
          chatStripRef.current?.commitOrBlurChat()
          return
        }
        if (active instanceof HTMLElement) {
          if (active.closest('[role="dialog"]')) return
          const tag = active.tagName
          if (tag === 'TEXTAREA' || active.isContentEditable) return
          if (tag === 'INPUT') return
          if (tag === 'SELECT' || tag === 'BUTTON') return
        }
        e.preventDefault()
        chatStripRef.current?.focusChat()
        return
      }

      if (chatFocused) return

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
    if (choice.kind === 'rental') {
      setRentalNpc(npc)
      return
    }
    if (choice.kind === 'healer') {
      try {
        if (choice.zenyCost > 0) {
          if (character.zeny < choice.zenyCost) {
            setMessage(`Need ${choice.zenyCost} zeny.`)
            return
          }
          const nextZeny = await spendCharacterZeny(character.id, -choice.zenyCost)
          if (nextZeny == null) {
            setMessage('Payment failed')
            return
          }
          const paid: CharacterRow = { ...characterRef.current, zeny: nextZeny }
          characterRef.current = paid
          onCharacterUpdated(paid)
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
        await tearDownGameForMapChange()
        setPosition({ x: res.character.x, y: res.character.y, mapId: res.character.map_id })
        onCharacterUpdated(res.character)
        emitGameEvent('status', `Warped to ${choice.label}`)
      } catch (err) {
        setMapLoading(null)
        setMessage(err instanceof Error ? err.message : 'Warp failed')
      }
      return
    }
    if (choice.kind === 'dungeon') {
      try {
        const floor = dungeonFloors().find((f) => f.id === choice.floorId)
        const mapId = floor?.mapId ?? choice.floorId
        setMapLoading({
          mapId,
          label: floor?.name ?? choice.label,
        })
        const res = await dungeonManage({
          action: 'enter',
          characterId: character.id,
          mapId: position.mapId,
          x: position.x,
          y: position.y,
          npcId: npc.id,
          floorId: choice.floorId,
        })
        if (res.instance) {
          const sync = dungeonInstanceToSync(res.instance)
          setBootDungeon(sync)
          emitGameEvent('dungeonSync', sync)
        }
        if (res.character) {
          await tearDownGameForMapChange()
          setPosition({ x: res.character.x, y: res.character.y, mapId: res.character.map_id })
          onCharacterUpdated(res.character)
        }
        emitGameEvent('status', `Entered ${choice.label}`)
      } catch (err) {
        setMapLoading(null)
        setMessage(err instanceof Error ? err.message : 'Dungeon entry failed')
      }
    }
  }

  async function runPartyAction(action: 'invite' | 'apply', targetCharacterId: string) {
    try {
      await partyManage({ action, characterId: character.id, targetCharacterId })
      setMessage(action === 'invite' ? 'Party invite sent.' : 'Party application sent.')
      refreshParty()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Party action failed')
    }
  }

  async function runDuelInvite(targetCharacterId: string) {
    try {
      await duelManage({ action: 'invite', characterId: character.id, targetCharacterId })
      setMessage('Duel invite sent.')
      setSelectedPlayer(null)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Duel invite failed')
    }
  }

  function appendMapSystemLine(text: string) {
    setMapChatLines((prev) =>
      [...prev, { characterId: 'system', name: 'System', text, at: Date.now() }].slice(-50),
    )
  }

  function showOverheadChat(characterId: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    emitGameEvent('chatBubble', { characterId, text: trimmed })
  }

  function sendChat(tab: 'map' | 'party', text: string) {
    const trimmed = text.trim()
    if (tab === 'map' && trimmed.startsWith('/')) {
      void (async () => {
        try {
          const result = await gmCommand({ characterId: character.id, command: trimmed })
          appendMapSystemLine(result.message)
          if (result.targetId === character.id && typeof result.newZeny === 'number') {
            const updated: CharacterRow = { ...characterRef.current, zeny: result.newZeny }
            characterRef.current = updated
            onCharacterUpdated(updated)
          }
        } catch (err) {
          appendMapSystemLine(err instanceof Error ? err.message : 'Command failed')
        }
      })()
      return true
    }
    const local = { characterId: character.id, name: character.name }
    if (tab === 'map') {
      const sent = mapChatRef.current?.send(local, text) ?? false
      if (sent) showOverheadChat(characterRef.current.id, trimmed)
      return sent
    }
    const sent = partyChannelRef.current?.sendChat(local, text) ?? false
    if (sent) showOverheadChat(characterRef.current.id, trimmed)
    return sent
  }

  const hudPortraitRevision = useMemo(
    () =>
      `${appearanceKey(appearanceFromCharacterRow(character))}|${sheet.jobId}|${JSON.stringify(sheet.equipment)}`,
    [
      character.gender,
      character.body_color,
      character.hair_color,
      character.eye_color,
      character.clothes_color,
      sheet.jobId,
      sheet.equipment,
    ],
  )

  const hpRatio = sheet.hpMax > 0 ? Math.min(1, sheet.hp / sheet.hpMax) : 0
  const mpRatio = sheet.mpMax > 0 ? Math.min(1, sheet.mp / sheet.mpMax) : 0
  const guildTag = guildSnapshot?.guild.tag

  const splashVisible = !sessionReady || !npcsReady || !dungeonReady || mapLoading !== null
  const splashConfig = useMemo(() => {
    if (!splashVisible) return null
    if (mapLoading) {
      return {
        phase: 'map' as const,
        headline: mapLoading.label,
        detail: mapLoading.mapId,
        progress: loadProgress,
      }
    }
    if (!dungeonReady) {
      return {
        phase: 'world' as const,
        detail: isDungeonMapId(character.map_id) ? 'dungeon' : undefined,
      }
    }
    if (!npcsReady) {
      return { phase: 'world' as const }
    }
    return { phase: 'session' as const }
  }, [
    splashVisible,
    mapLoading,
    dungeonReady,
    npcsReady,
    loadProgress,
    character.map_id,
  ])
  const splashKey = mapLoading?.mapId ?? `world-${character.map_id}`

  const mapDropTooltipStyle = useMemo(() => {
    if (!mapDropHover) return null
    const rect = hostRef.current?.getBoundingClientRect()
    if (!rect) return null
    return floatingTooltipPositionFromPoint(
      rect.left + mapDropHover.screenX,
      rect.top + mapDropHover.screenY,
    )
  }, [mapDropHover])

  const mapDropTooltipDetail = useMemo(
    () => (mapDropHover ? buildItemTooltipDetail(mapDropHover.itemId) : null),
    [mapDropHover],
  )

  const hudMenuItems: GameHudMenuItem[] = [
    { id: 'stats', label: 'Stats', title: 'Stats (Alt+S)', onClick: () => setStatsOpen(true) },
    { id: 'inventory', label: 'Inventory', title: 'Inventory (Alt+I)', onClick: () => setInventoryOpen(true) },
    { id: 'equipment', label: 'Equipment', title: 'Equipment (Alt+E)', onClick: () => setEquipmentOpen(true) },
    { id: 'skills', label: 'Skills', title: 'Skills (Alt+K)', onClick: () => setSkillsOpen(true) },
    { id: 'party', label: 'Party', onClick: () => setPartyOpen(true) },
    { id: 'guild', label: 'Guild', onClick: () => setGuildOpen(true) },
    { id: 'vendor', label: 'Vending', onClick: () => setVendorSetupOpen(true) },
    { id: 'leave', label: 'Leave world', variant: 'leave', onClick: () => void leaveWorld() },
  ]

  return (
    <div
      ref={shellRef}
      className={`game-shell game-shell--fullscreen${skillsOpen ? ' skills-assign-mode' : ''}`}
    >
      <AnimatePresence>
        {splashConfig ? <SplashScreen key={splashKey} {...splashConfig} /> : null}
      </AnimatePresence>
      <div className="game-stage game-stage--fullscreen" aria-label="Game world">
        <div ref={hostRef} className="game-canvas" />
        {mapDropTooltipDetail && mapDropTooltipStyle && (
          <FloatingTooltipPortal style={mapDropTooltipStyle}>
            <ItemDetailTooltip detail={mapDropTooltipDetail} />
          </FloatingTooltipPortal>
        )}
        <LowHpVignette hp={sheet.hp} hpMax={sheet.hpMax} />
        {duelSync && <DuelCountdownOverlay duel={duelSync} />}
        {selectedPlayer && selectedPlayerAnchor && (
          <PlayerTargetPopup
            player={selectedPlayer}
            anchor={selectedPlayerAnchor}
            pvpMap={isPvpMap(character.map_id)}
            onAttack={() => {
              emitGameEvent('pvpAttackRequest', { characterId: selectedPlayer.characterId })
              setSelectedPlayer(null)
            }}
            onTrade={() =>
              setTradePartner({
                characterId: selectedPlayer.characterId,
                name: selectedPlayer.name,
              })
            }
            onDuel={() => void runDuelInvite(selectedPlayer.characterId)}
            onInvite={() => void runPartyAction('invite', selectedPlayer.characterId)}
            onApply={() => void runPartyAction('apply', selectedPlayer.characterId)}
            onBrowseShop={() => setVendorShopTarget(selectedPlayer)}
          />
        )}

        <div className="game-hud-overlay" aria-label="Game HUD">
          <PvpKillAnnounceOverlay announce={pvpAnnounce} />
          {status ? (
            <div className="game-hud-status-message" aria-live="polite">
              {status}
            </div>
          ) : null}
          <SkillBar sheet={sheet} onOpenSkills={() => setSkillsOpen(true)} />
          <Minimap data={minimap} />
          <BuffBar buffs={playerBuffs} />
          <div className="game-hud-top-cluster">
            <div className="game-hud-vitals-column">
            <motion.div className="game-hud-panel game-hud-vitals" {...hudEnterMotion} transition={{ ...hudEnterMotion.transition, delay: 0.04 }}>
              <div className="game-hud-vitals__body">
                <div className="game-hud-vitals__avatar" aria-hidden>
                  <PlayerHudPortrait gameRef={gameRef} revision={hudPortraitRevision} />
                </div>
                <div className="game-hud-vitals__main">
                  <p className="game-hud-name">
                    <strong>
                      {guildTag ? `[${guildTag}] ` : ''}
                      {character.name}
                    </strong>
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
                  {sheet.hp <= 0 && !deathModalOpen && !pvpDeathModalOpen && !isPvpMap(character.map_id) && (
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => {
                        void loadAccountSavePoint().then((save) => {
                          setDeathSaveMapId(save.mapId)
                          setDeathModalOpen(true)
                        })
                      }}
                    >
                      Respawn options
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            {isPvpMap(character.map_id) && (
              <motion.div
                className="game-hud-panel game-hud-pvp-kills"
                {...hudEnterMotion}
                transition={{ ...hudEnterMotion.transition, delay: 0.1 }}
              >
                <span className="game-hud-pvp-kills__label">Kills</span>
                <strong className="game-hud-pvp-kills__value">{pvpKillCount}</strong>
              </motion.div>
            )}
            </div>

            {selectedMob ? (
              <motion.div
                className="game-hud-panel game-hud-target"
                {...hudEnterMotion}
                transition={{ ...hudEnterMotion.transition, delay: 0.08 }}
              >
                <h3>Target</h3>
                <div className="target-panel">
                  <p><strong>{selectedMob.name}</strong></p>
                  <p className="muted small">Lv {selectedMob.level}</p>
                  <p className="small">HP {selectedMob.hp} / {selectedMob.hpMax}</p>
                </div>
              </motion.div>
            ) : null}
          </div>

          <motion.div
            {...hudEnterMotion}
            transition={{ ...hudEnterMotion.transition, delay: 0.12 }}
          >
            <GameHudMenu items={hudMenuItems} />
          </motion.div>

          <motion.div
            className="game-hud-panel game-hud-nearby"
            {...hudEnterMotion}
            transition={{ ...hudEnterMotion.transition, delay: 0.16 }}
          >
            <h3>Nearby</h3>
            <ul className="item-list">
              {remotePlayers.map((p) => (
                <li
                  key={p.characterId}
                  className={`small${selectedPlayer?.characterId === p.characterId ? ' nearby-selected' : ''}`}
                >
                  {p.name}
                  {p.isVending ? ' [Shop]' : ''}
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

          <ChatStrip
            ref={chatStripRef}
            partyEnabled={!!partySnapshot}
            mapLines={mapChatLines}
            partyLines={partyChatLines}
            activityEntries={activityLog}
            onSend={sendChat}
            mapChatPlaceholder={
              character.is_gm ? 'Say something… or /zeny <player> <amount>' : undefined
            }
          />

          <motion.div
            className="game-hud-bottom"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30, delay: 0.2 }}
          >
            <div className="game-bottom-dock">
              <ExperienceHud sheet={sheet} />
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {statsOpen && (
          <StatsWindow
            key="stats"
            character={character}
            sheet={sheet}
            onCharacterUpdated={onCharacterUpdated}
            onClose={() => setStatsOpen(false)}
          />
        )}
        {inventoryOpen && (
          <InventoryWindow
            key="inventory"
            characterId={character.id}
            sheet={sheet}
            onClose={() => setInventoryOpen(false)}
          />
        )}
        {equipmentOpen && (
          <EquipmentWindow
            key="equipment"
            sheet={sheet}
            appearance={appearanceFromCharacterRow(character)}
            onClose={() => setEquipmentOpen(false)}
          />
        )}
        {skillsOpen && (
          <SkillsWindow
            key="skills"
            character={character}
            sheet={sheet}
            onCharacterUpdated={onCharacterUpdated}
            onClose={() => setSkillsOpen(false)}
          />
        )}
        {npcMenu && (
          <NpcOptionsModal
            key={`npc-${npcMenu.id}`}
            npc={npcMenu}
            baseLevel={sheet.baseLevel}
            partyEnabled={!!partySnapshot}
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
        {shopNpc &&
          (isRarityTabShop(shopNpc.config) ? (
            <RarityTabShopModal
              key={`shop-${shopNpc.id}`}
              character={character}
              npc={shopNpc}
              sheet={sheet}
              onClose={() => setShopNpc(null)}
              onCharacterUpdated={onCharacterUpdated}
            />
          ) : (
            <ShopModal
              key={`shop-${shopNpc.id}`}
              character={character}
              npc={shopNpc}
              sheet={sheet}
              onClose={() => setShopNpc(null)}
              onCharacterUpdated={onCharacterUpdated}
            />
          ))}
        {rentalNpc && (
          <RentalModal
            key={`rental-${rentalNpc.id}`}
            character={character}
            npc={rentalNpc}
            sheet={sheet}
            onClose={() => setRentalNpc(null)}
            onCharacterUpdated={onCharacterUpdated}
            onMessage={setMessage}
          />
        )}
        {partyRequest && (
          <PartyRequestModal
            key={partyRequest.request.id}
            characterId={character.id}
            request={partyRequest.request}
            fromName={partyRequest.fromName}
            onClose={() => setPartyRequest(null)}
            onResolved={refreshParty}
          />
        )}
        {duelInvite && (
          <DuelInviteModal
            key={duelInvite.id}
            characterId={character.id}
            duel={duelInvite}
            onClose={() => setDuelInvite(null)}
            onResolved={() => setDuelInvite(null)}
          />
        )}
        {deathModalOpen && (
          <DeathModal
            key="death"
            saveMapId={deathSaveMapId}
            onStay={() => setDeathModalOpen(false)}
            onReturnToSave={returnToSavePoint}
          />
        )}
        {pvpDeathModalOpen && (
          <PvpDeathModal
            key="pvp-death"
            onRespawn={respawnInPvpArena}
            onLeave={leavePvpRoom}
          />
        )}
        {partyOpen && (
          <PartyWindow
            key="party"
            characterId={character.id}
            snapshot={partySnapshot}
            onClose={() => setPartyOpen(false)}
            onChanged={refreshParty}
            onMessage={setMessage}
          />
        )}
        {guildOpen && (
          <GuildModal
            key="guild"
            characterId={character.id}
            snapshot={guildSnapshot}
            onClose={() => setGuildOpen(false)}
            onChanged={refreshGuild}
            onCharacterUpdated={() => {
              void supabase
                .from('characters')
                .select('*')
                .eq('id', character.id)
                .single()
                .then(({ data }) => {
                  if (data) onCharacterUpdated(data)
                })
            }}
            onMessage={setMessage}
          />
        )}
        {vendorSetupOpen && (
          <VendorSetupModal
            key="vendor-setup"
            characterId={character.id}
            sheet={sheet}
            mapId={position.mapId}
            x={position.x}
            y={position.y}
            title={stallTitle}
            onClose={() => setVendorSetupOpen(false)}
            onOpened={() => setVendingOpen(true)}
            onStallClosed={() => {
              setVendingOpen(false)
              void loadCharacterSession(character.id).then((loaded) => {
                sessionRef.current = loaded
                setSheet(toCharacterSheetPayload(loaded))
                emitGameEvent('sessionSync', loaded)
              })
            }}
            onMessage={setMessage}
          />
        )}
        {vendorShopTarget && (
          <VendorShopModal
            key={`vendor-${vendorShopTarget.characterId}`}
            buyer={character}
            sellerCharacterId={vendorShopTarget.characterId}
            sellerName={vendorShopTarget.name}
            stallTitle={vendorShopTarget.stallTitle}
            onClose={() => setVendorShopTarget(null)}
            onCharacterUpdated={onCharacterUpdated}
            onMessage={setMessage}
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
