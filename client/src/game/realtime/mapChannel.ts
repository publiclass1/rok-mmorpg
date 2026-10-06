import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { createDefaultEquipment } from '../character/characterState'
import type { PlayerPresencePayload } from '../events'

const BROADCAST_MS = 50
const STALE_MS = 5000
const PRUNE_MS = 1000

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
    equipment: raw.equipment ?? createDefaultEquipment(),
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
  private mapId: string
  private local: PlayerPresencePayload
  private onUpdate: (remotes: PlayerPresencePayload[]) => void

  constructor(
    mapId: string,
    local: PlayerPresencePayload,
    onUpdate: (remotes: PlayerPresencePayload[]) => void,
  ) {
    this.mapId = mapId
    this.local = local
    this.onUpdate = onUpdate
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
    this.channel = supabase.channel(`map:${this.mapId}`, {
      config: { broadcast: { self: false } },
    })

    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = normalizePresence(payload as Partial<PlayerPresencePayload>)
      if (!p || p.characterId === this.local.characterId) return
      this.remotes.set(p.characterId, { payload: p, at: Date.now() })
      this.emitRemotes()
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
