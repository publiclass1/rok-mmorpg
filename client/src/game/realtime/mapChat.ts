import { broadcastToRoom, getGameSocket, joinRealtimeRoom, leaveRealtimeRoom } from '../../lib/socket'

export type ChatMessage = {
  characterId: string
  name: string
  text: string
  at: number
}

const MIN_SEND_MS = 800

export class MapChatChannel {
  private lastSend = 0
  private room: string
  private onMessage: (msg: ChatMessage) => void
  private onChatHandler = (payload: Partial<ChatMessage>) => {
    const p = payload
    if (!p.characterId || !p.name || !p.text) return
    this.onMessage({
      characterId: p.characterId,
      name: p.name,
      text: p.text.slice(0, 200),
      at: p.at ?? Date.now(),
    })
  }

  constructor(mapId: string, onMessage: (msg: ChatMessage) => void) {
    this.room = `map:${mapId}`
    this.onMessage = onMessage
  }

  async join() {
    joinRealtimeRoom(this.room)
    getGameSocket().on('chat', this.onChatHandler)
  }

  send(local: { characterId: string; name: string }, text: string) {
    const trimmed = text.trim().slice(0, 200)
    if (!trimmed) return false
    const now = Date.now()
    if (now - this.lastSend < MIN_SEND_MS) return false
    this.lastSend = now
    broadcastToRoom(this.room, 'chat', {
      characterId: local.characterId,
      name: local.name,
      text: trimmed,
      at: now,
    })
    return true
  }

  async leave() {
    getGameSocket().off('chat', this.onChatHandler)
    leaveRealtimeRoom(this.room)
  }
}
