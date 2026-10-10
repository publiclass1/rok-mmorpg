import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { verifyAccessToken } from '../lib/auth.js'

export type GameIo = Server

let io: GameIo | null = null

export function initSocket(httpServer: HttpServer, corsOrigin: string): GameIo {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    path: '/socket.io',
  })

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) ?? ''
    const verified = token ? verifyAccessToken(token) : null
    if (!verified) {
      next(new Error('Unauthorized'))
      return
    }
    socket.data.userId = verified.userId
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    void socket.join(`user:${userId}`)

    socket.on('join', (room: string) => {
      if (typeof room !== 'string' || !/^(map|party|trade|duel):/.test(room)) return
      void socket.join(room)
    })

    socket.on('leave', (room: string) => {
      if (typeof room !== 'string') return
      void socket.leave(room)
    })

    socket.on('broadcast', (payload: { room: string; event: string; data: unknown }) => {
      if (!payload?.room || !payload.event) return
      if (!/^(map|party):/.test(payload.room)) return
      socket.to(payload.room).emit(payload.event, payload.data)
    })
  })

  return io
}

export function getIo(): GameIo {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  if (!io) return
  io.to(room).emit(event, data)
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}
