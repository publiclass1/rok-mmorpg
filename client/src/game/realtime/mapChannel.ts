import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
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

async function sendLeaveBroadcast(channel: RealtimeChannel, payload: { characterId: string; mapId: string }) {
  await Promise.race([
    channel.send({
      type: 'broadcast',
      event: 'leave',
      payload,
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, LEAVE_SEND_TIMEOUT_MS)
    }),
  ])
}

export class MapPresenceChannel {
  private channel: RealtimeChannel | null = null
  private readonly remotes = new Map<string, RemoteEntry>()
  private broadcastTimer: number | null = null
  private pruneTimer: number | null = null
  private readonly mapId: string
  private channelKey: string
  private local: PlayerPresencePayload
  private onUpdate: (remotes: PlayerPresencePayload[]) => void
  private onCombat: ((payload: MapCombatPayload) => void) | null = null
  private leaving = false

  constructor(
    mapId: string,
    local: PlayerPresencePayload,
    onUpdate: (remotes: PlayerPresencePayload[]) => void,
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
    if (!this.channel) return
    void this.channel.send({
      type: 'broadcast',
      event: 'combat',
      payload,
    })
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

  async join() {
    this.channel = supabase.channel(this.channelKey, {
      config: { broadcast: { self: false } },
    })

    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = normalizePresence(payload as Partial<PlayerPresencePayload>, this.mapId)
      if (!p || p.characterId === this.local.characterId) return
      if (p.mapId !== this.mapId) {
        if (this.removeRemote(p.characterId)) this.emitRemotes()
        return
      }
      this.remotes.set(p.characterId, { payload: p, at: Date.now() })
      this.emitRemotes()
    })

    this.channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
      const characterId = parsePresenceLeaveCharacterId(payload)
      if (!characterId || characterId === this.local.characterId) return
      if (this.removeRemote(characterId)) this.emitRemotes()
    })

    this.channel.on('broadcast', { event: 'combat' }, ({ payload }) => {
      const p = normalizeMapCombatPayload(payload)
      if (!p) return
      if ('characterId' in p && p.characterId === this.local.characterId) return
      this.onCombat?.(p)
    })

    await this.channel.subscribe()
    this.pruneTimer = window.setInterval(() => this.pruneStale(), PRUNE_MS)
  }

  startBroadcast(getPosition: () => PlayerPresencePayload) {
    this.stopBroadcast()
    this.broadcastTimer = window.setInterval(() => {
      if (!this.channel) return
      const pos = getPosition()
      void this.channel.send({
        type: 'broadcast',
        event: 'pos',
        payload: pos,
      })
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

    const channel = this.channel
    if (channel) {
      await sendLeaveBroadcast(channel, {
        characterId: this.local.characterId,
        mapId: this.mapId,
      })
      await supabase.removeChannel(channel)
      this.channel = null
    }
    this.remotes.clear()
  }
}
