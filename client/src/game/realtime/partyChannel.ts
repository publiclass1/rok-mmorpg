import { broadcastToRoom, getGameSocket, joinRealtimeRoom, leaveRealtimeRoom } from '../../lib/socket'
import type { ChatMessage } from './mapChat'
import type { PartyExpGrantPayload } from '../events'

const MIN_SEND_MS = 800

export class PartyRealtimeChannel {
  private lastChatSend = 0
  private room: string
  private onChat: (msg: ChatMessage) => void
  private onExpGrant: (payload: PartyExpGrantPayload) => void

  private onChatHandler = (payload: Partial<ChatMessage>) => {
    const p = payload
    if (!p.characterId || !p.name || !p.text) return
    this.onChat({
      characterId: p.characterId,
      name: p.name,
      text: p.text.slice(0, 200),
      at: p.at ?? Date.now(),
    })
  }

  private onExpHandler = (payload: Partial<PartyExpGrantPayload>) => {
    const p = payload
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
  }

  constructor(
    partyId: string,
    onChat: (msg: ChatMessage) => void,
    onExpGrant: (payload: PartyExpGrantPayload) => void,
  ) {
    this.room = `party:${partyId}`
    this.onChat = onChat
    this.onExpGrant = onExpGrant
  }

  async join() {
    await this.leave()
    joinRealtimeRoom(this.room)
    const socket = getGameSocket()
    socket.on('chat', this.onChatHandler)
    socket.on('exp_grant', this.onExpHandler)
  }

  sendChat(local: { characterId: string; name: string }, text: string) {
    const trimmed = text.trim().slice(0, 200)
    if (!trimmed) return false
    const now = Date.now()
    if (now - this.lastChatSend < MIN_SEND_MS) return false
    this.lastChatSend = now
    broadcastToRoom(this.room, 'chat', {
      characterId: local.characterId,
      name: local.name,
      text: trimmed,
      at: now,
    })
    return true
  }

  broadcastExpGrant(payload: Omit<PartyExpGrantPayload, 'at'>) {
    broadcastToRoom(this.room, 'exp_grant', { ...payload, at: Date.now() })
  }

  async leave() {
    const socket = getGameSocket()
    socket.off('chat', this.onChatHandler)
    socket.off('exp_grant', this.onExpHandler)
    leaveRealtimeRoom(this.room)
  }
}
