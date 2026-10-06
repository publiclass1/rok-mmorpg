import type { NpcRow } from '../types/database'

export type PositionPayload = {
  characterId: string
  name: string
  x: number
  y: number
  facing: 'up' | 'down' | 'left' | 'right'
}

export type GameEvents = {
  position: { x: number; y: number; mapId: string }
  npcNearby: NpcRow | null
  remotePlayers: Array<{ characterId: string; name: string; x: number; y: number }>
  status: string
}

type Listener = (payload: unknown) => void

const listeners: Record<string, Set<Listener>> = {}

export function onGameEvent<K extends keyof GameEvents>(event: K, fn: (payload: GameEvents[K]) => void) {
  if (!listeners[event]) listeners[event] = new Set()
  listeners[event].add(fn as Listener)
  return () => listeners[event].delete(fn as Listener)
}

export function emitGameEvent<K extends keyof GameEvents>(event: K, payload: GameEvents[K]) {
  listeners[event]?.forEach((fn) => fn(payload))
}
