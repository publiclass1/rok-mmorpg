import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { PositionPayload } from '../events'

export class MapPresenceChannel {
  private channel: RealtimeChannel | null = null
  private readonly remotes = new Map<string, PositionPayload>()
  private broadcastTimer: number | null = null
  private mapId: string
  private local: PositionPayload
  private onUpdate: (remotes: PositionPayload[]) => void

  constructor(
    mapId: string,
    local: PositionPayload,
    onUpdate: (remotes: PositionPayload[]) => void,
  ) {
    this.mapId = mapId
    this.local = local
    this.onUpdate = onUpdate
  }

  async join() {
    this.channel = supabase.channel(`map:${this.mapId}`, {
      config: { broadcast: { self: false } },
    })

    this.channel.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as PositionPayload
      if (!p?.characterId || p.characterId === this.local.characterId) return
      this.remotes.set(p.characterId, p)
      this.onUpdate([...this.remotes.values()])
    })

    await this.channel.subscribe()
  }

  startBroadcast(getPosition: () => PositionPayload) {
    this.stopBroadcast()
    this.broadcastTimer = window.setInterval(() => {
      if (!this.channel) return
      const pos = getPosition()
      void this.channel.send({
        type: 'broadcast',
        event: 'pos',
        payload: pos,
      })
    }, 100)
  }

  stopBroadcast() {
    if (this.broadcastTimer) {
      window.clearInterval(this.broadcastTimer)
      this.broadcastTimer = null
    }
  }

  async leave() {
    this.stopBroadcast()
    if (this.channel) {
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.remotes.clear()
  }
}
