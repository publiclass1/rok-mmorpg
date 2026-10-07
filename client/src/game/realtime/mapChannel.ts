import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { DEFAULT_CHARACTER_APPEARANCE, type CharacterAppearance } from '../character/characterAppearance'
import { createDefaultEquipment } from '../character/characterState'
import type { PlayerPresencePayload } from '../events'
import { normalizeMapCombatPayload, type MapCombatPayload } from './mapCombatTypes'

const BROADCAST_MS = 50
const STALE_MS = 5000
const PRUNE_MS = 1000

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

function normalizePresence(raw: Partial<PlayerPresencePayload>): PlayerPresencePayload | null {
  if (!raw.characterId || !raw.name) return null
  return {
    characterId: raw.characterId,
    name: raw.name,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    facing: raw.facing ?? 'down',
    anim: raw.anim ?? 'idle',
    walkFrame: raw.walkFrame === 1 ? 1 : 0,
    mounted: Boolean(raw.mounted),
    equipment: raw.equipment ?? createDefaultEquipment(),
    appearance: normalizeAppearance(raw.appearance),
    guildTag: raw.guildTag ?? null,
    isVending: Boolean(raw.isVending),
    stallTitle: raw.stallTitle ?? null,
  }
}

type RemoteEntry = {
  payload: PlayerPresencePayload
  at: number
}

export class MapPresenceChannel {
  private channel: RealtimeChannel | null = null
  private readonly remotes = new Map<string, RemoteEntry>()
  private broadcastTimer: number | null = null
  private pruneTimer: number | null = null
  private channelKey: string
  private local: PlayerPresencePayload
  private onUpdate: (remotes: PlayerPresencePayload[]) => void
  private onCombat: ((payload: MapCombatPayload) => void) | null = null

  constructor(
    mapId: string,
    local: PlayerPresencePayload,
    onUpdate: (remotes: PlayerPresencePayload[]) => void,
    channelKey?: string,
  ) {
    this.channelKey = channelKey ?? `map:${mapId}`
    this.local = local
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

  private pruneStale() {
    const now = Date.now()
    let changed = false
    for (const [id, entry] of this.remotes) {
      if (now - entry.at > STALE_MS) {
        this.remotes.delete(id)
        changed = true
      }
    }
    if (changed) this.emitRemotes()
  }

  async join() {
    this.channel = supabase.channel(this.channelKey, {
      config: { broadcast: { self: false } },
    })

    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = normalizePresence(payload as Partial<PlayerPresencePayload>)
      if (!p || p.characterId === this.local.characterId) return
      this.remotes.set(p.characterId, { payload: p, at: Date.now() })
      this.emitRemotes()
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
    this.stopBroadcast()
    if (this.pruneTimer) {
      window.clearInterval(this.pruneTimer)
      this.pruneTimer = null
    }
    if (this.channel) {
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.remotes.clear()
  }
}
