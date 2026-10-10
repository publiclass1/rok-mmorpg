import { broadcastToRoom, getGameSocket, joinRealtimeRoom, leaveRealtimeRoom } from '../../lib/socket'
import { DEFAULT_CHARACTER_APPEARANCE, type CharacterAppearance } from '../character/characterAppearance'
import { createDefaultEquipment } from '../character/characterState'
import type { PlayerPresencePayload } from '../events'
import { parseDuelCombatSnapshot } from '../duel/duelCombatSnapshot'
import { clearActiveMapPresence } from './activeMapPresence'
import { normalizeMapCombatPayload, type MapCombatPayload } from './mapCombatTypes'
import { parsePresenceLeaveCharacterId, pruneStaleRemoteEntries } from './mapPresenceUtils'

const BROADCAST_MS = 50
const PRUNE_MS = 1000
const LEAVE_SEND_TIMEOUT_MS = 500

function normalizeAppearance(raw: Partial<CharacterAppearance> | undefined): CharacterAppearance {
  if (!raw) return { ...DEFAULT_CHARACTER_APPEARANCE }
  return {
    gender: raw.gender === 'female' ? 'female' : 'male',
    bodyColor: typeof raw.bodyColor === 'number' ? raw.bodyColor : DEFAULT_CHARACTER_APPEARANCE.bodyColor,
    hairColor: typeof raw.hairColor === 'number' ? raw.hairColor : DEFAULT_CHARACTER_APPEARANCE.hairColor,
    eyeColor: typeof raw.eyeColor === 'number' ? raw.eyeColor : DEFAULT_CHARACTER_APPEARANCE.eyeColor,
    clothesColor:
      typeof raw.clothesColor === 'number' ? raw.clothesColor : DEFAULT_CHARACTER_APPEARANCE.clothesColor,
  }
}

function normalizePresence(raw: Partial<PlayerPresencePayload>, channelMapId: string): PlayerPresencePayload | null {
  if (!raw.characterId || !raw.name) return null
  const mapId =
    typeof raw.mapId === 'string' && raw.mapId.trim() ? raw.mapId.trim() : channelMapId
  return {
    characterId: raw.characterId,
    name: raw.name,
    mapId,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    facing: raw.facing ?? 'down',
    anim: raw.anim ?? 'idle',
    walkFrame: raw.walkFrame === 1 ? 1 : 0,
    mounted: Boolean(raw.mounted),
    jobId: typeof raw.jobId === 'string' && raw.jobId.trim() ? raw.jobId.trim() : 'novice',
    equipment: raw.equipment ?? createDefaultEquipment(),
    appearance: normalizeAppearance(raw.appearance),
    guildTag: raw.guildTag ?? null,
    isVending: Boolean(raw.isVending),
    stallTitle: raw.stallTitle ?? null,
    pvpSnapshot: raw.pvpSnapshot != null ? parseDuelCombatSnapshot(raw.pvpSnapshot) : undefined,
  }
}

type RemoteEntry = {
  payload: PlayerPresencePayload
  at: number
}

async function sendLeaveBroadcast(room: string, payload: { characterId: string; mapId: string }) {
  await Promise.race([
    Promise.resolve(broadcastToRoom(room, 'leave', payload)),
    new Promise((resolve) => window.setTimeout(resolve, LEAVE_SEND_TIMEOUT_MS)),
  ])
}

export class MapPresenceChannel {
  private readonly channelKey: string
  private readonly mapId: string
  private local: PlayerPresencePayload
  private readonly onUpdate: (players: PlayerPresencePayload[]) => void
  private onCombat: ((payload: MapCombatPayload) => void) | null = null
  private remotes = new Map<string, RemoteEntry>()
  private broadcastTimer: number | null = null
  private pruneTimer: number | null = null
  private leaving = false
  private socketBound = false

  constructor(
    mapId: string,
    local: PlayerPresencePayload,
    onUpdate: (players: PlayerPresencePayload[]) => void,
    channelKey?: string,
  ) {
    this.mapId = mapId
    this.channelKey = channelKey ?? `map:${mapId}`
    this.local = { ...local, mapId: local.mapId ?? mapId }
    this.onUpdate = onUpdate
  }

  setCombatHandler(handler: ((payload: MapCombatPayload) => void) | null) {
    this.onCombat = handler
  }

  sendCombat(payload: MapCombatPayload) {
    broadcastToRoom(this.channelKey, 'combat', payload)
  }

  private emitRemotes() {
    this.onUpdate([...this.remotes.values()].map((e) => e.payload))
  }

  private removeRemote(characterId: string): boolean {
    return this.remotes.delete(characterId)
  }

  private pruneStale() {
    const changed = pruneStaleRemoteEntries(this.remotes, Date.now())
    if (changed) this.emitRemotes()
  }

  private bindSocket() {
    if (this.socketBound) return
    this.socketBound = true
    const socket = getGameSocket()

    socket.on('pos', (payload: Partial<PlayerPresencePayload>) => {
      const p = normalizePresence(payload, this.mapId)
      if (!p || p.characterId === this.local.characterId) return
      if (p.mapId !== this.mapId) {
        if (this.removeRemote(p.characterId)) this.emitRemotes()
        return
      }
      this.remotes.set(p.characterId, { payload: p, at: Date.now() })
      this.emitRemotes()
    })

    socket.on('leave', (payload: unknown) => {
      const characterId = parsePresenceLeaveCharacterId(payload)
      if (!characterId || characterId === this.local.characterId) return
      if (this.removeRemote(characterId)) this.emitRemotes()
    })

    socket.on('combat', (payload: unknown) => {
      const p = normalizeMapCombatPayload(payload)
      if (!p) return
      if ('characterId' in p && p.characterId === this.local.characterId) return
      if (this.onCombat) this.onCombat(p)
    })
  }

  async join() {
    joinRealtimeRoom(this.channelKey)
    this.bindSocket()
    this.pruneTimer = window.setInterval(() => this.pruneStale(), PRUNE_MS)
  }

  startBroadcast(getPosition: () => PlayerPresencePayload) {
    this.stopBroadcast()
    this.broadcastTimer = window.setInterval(() => {
      const pos = getPosition()
      broadcastToRoom(this.channelKey, 'pos', pos)
    }, BROADCAST_MS)
  }

  stopBroadcast() {
    if (this.broadcastTimer) {
      window.clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
    }
  }

  async leave() {
    if (this.leaving) return
    this.leaving = true
    clearActiveMapPresence(this)

    this.stopBroadcast()
    if (this.pruneTimer) {
      window.clearInterval(this.pruneTimer)
      this.pruneTimer = null
    }

    await sendLeaveBroadcast(this.channelKey, {
      characterId: this.local.characterId,
      mapId: this.mapId,
    })
    leaveRealtimeRoom(this.channelKey)
    this.remotes.clear()
  }
}
