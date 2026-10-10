import { io, type Socket } from 'socket.io-client'
import { loadStoredToken } from './authStore'

let socket: Socket | null = null

function socketUrl(): string {
  const ws = import.meta.env.VITE_WS_URL?.trim()
  if (ws) return ws.replace(/\/$/, '')
  const api = import.meta.env.VITE_API_URL?.trim()
  if (api) return api.replace(/\/$/, '')
  return window.location.origin
}

export function getGameSocket(): Socket {
  if (socket?.connected) return socket
  if (socket) return socket

  socket = io(socketUrl(), {
    path: '/socket.io',
    autoConnect: true,
    auth: { token: loadStoredToken() ?? '' },
  })
  return socket
}

export function disconnectGameSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function joinRealtimeRoom(room: string): void {
  getGameSocket().emit('join', room)
}

export function leaveRealtimeRoom(room: string): void {
  getGameSocket().emit('leave', room)
}

export function broadcastToRoom(room: string, event: string, data: unknown): void {
  getGameSocket().emit('broadcast', { room, event, data })
}
