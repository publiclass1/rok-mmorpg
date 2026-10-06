import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { ChatMessage } from './mapChat'
import type { PartyExpGrantPayload } from '../events'

const MIN_SEND_MS = 800

export class PartyRealtimeChannel {
  private channel: RealtimeChannel | null = null
  private lastChatSend = 0
  private partyId: string
  private onChat: (msg: ChatMessage) => void
  private onExpGrant: (payload: PartyExpGrantPayload) => void

  constructor(
    partyId: string,
    onChat: (msg: ChatMessage) => void,
    onExpGrant: (payload: PartyExpGrantPayload) => void,
  ) {
    this.partyId = partyId
    this.onChat = onChat
    this.onExpGrant = onExpGrant
  }

  async join() {
    await this.leave()
    this.channel = supabase.channel(`party:${this.partyId}`, {
      config: { broadcast: { self: false } },
    })

    this.channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const p = payload as Partial<ChatMessage>
      if (!p.characterId || !p.name || !p.text) return
      this.onChat({
        characterId: p.characterId,
        name: p.name,
        text: p.text.slice(0, 200),
        at: p.at ?? Date.now(),
      })
    })

    this.channel.on('broadcast', { event: 'exp_grant' }, ({ payload }) => {
      const p = payload as Partial<PartyExpGrantPayload>
      if (p.killerCharacterId == null || p.baseExp == null || p.jobExp == null) return
      this.onExpGrant({
        killerCharacterId: p.killerCharacterId,
        baseExp: p.baseExp,
        jobExp: p.jobExp,
        mapId: p.mapId ?? '',
        x: p.x ?? 0,
        y: p.y ?? 0,
        at: p.at ?? Date.now(),
      })
    })

    await this.channel.subscribe()
  }

  sendChat(local: { characterId: string; name: string }, text: string) {
    const trimmed = text.trim().slice(0, 200)
    if (!trimmed || !this.channel) return false
    const now = Date.now()
    if (now - this.lastChatSend < MIN_SEND_MS) return false
    this.lastChatSend = now
    void this.channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: { characterId: local.characterId, name: local.name, text: trimmed, at: now },
    })
    return true
  }

  broadcastExpGrant(payload: Omit<PartyExpGrantPayload, 'at'>) {
    if (!this.channel) return
    void this.channel.send({
      type: 'broadcast',
      event: 'exp_grant',
      payload: { ...payload, at: Date.now() },
    })
  }

  async leave() {
    if (this.channel) {
      await supabase.removeChannel(this.channel)
      this.channel = null
    }
  }
}
