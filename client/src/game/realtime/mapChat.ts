import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export type ChatMessage = {
  characterId: string
  name: string
  text: string
  at: number
}

const MIN_SEND_MS = 800

export class MapChatChannel {
  private channel: RealtimeChannel | null = null
  private lastSend = 0
  private mapId: string
  private onMessage: (msg: ChatMessage) => void

  constructor(mapId: string, onMessage: (msg: ChatMessage) => void) {
    this.mapId = mapId
    this.onMessage = onMessage
  }

  async join() {
    this.channel = supabase.channel(`map:${this.mapId}`, {
      config: { broadcast: { self: true } },
    })

    this.channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const p = payload as Partial<ChatMessage>
      if (!p.characterId || !p.name || !p.text) return
      this.onMessage({
        characterId: p.characterId,
        name: p.name,
        text: p.text.slice(0, 200),
        at: p.at ?? Date.now(),
      })
    })

    await this.channel.subscribe()
  }

  send(local: { characterId: string; name: string }, text: string) {
    const trimmed = text.trim().slice(0, 200)
    if (!trimmed || !this.channel) return false
    const now = Date.now()
    if (now - this.lastSend < MIN_SEND_MS) return false
    this.lastSend = now
    void this.channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: { characterId: local.characterId, name: local.name, text: trimmed, at: now },
    })
    return true
  }

  async leave() {
    if (this.channel) {
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
  }
}
