import { loadRoContent } from '../../content/ro/loadContent'

export function isPvpMap(mapId: string): boolean {
  const map = loadRoContent().maps.find((m) => m.id === mapId)
  return map?.fieldType === 'pvp'
}

/** Tile-aligned rects (x, y, width, height in pixels) for random respawn in pvp_room. */
export const PVP_ROOM_RESPAWN_ZONES: Array<{ x: number; y: number; width: number; height: number }> = [
  { x: 96, y: 96, width: 384, height: 320 },
  { x: 704, y: 96, width: 384, height: 320 },
  { x: 96, y: 704, width: 384, height: 320 },
  { x: 704, y: 704, width: 384, height: 320 },
  { x: 384, y: 384, width: 256, height: 256 },
]

export const PVP_ROOM_EXIT_TELEPORT = {
  npcId: 'pvp_room_exit',
  mapId: 'pvp_room',
  destinationMapId: 'prontera',
  npcX: 656,
  npcY: 1152,
}

export const PVP_KILL_STREAK_WINDOW_MS = 15_000

/** Standing passive HP/SP regen tick interval in PVP maps (ms); sit uses sitRegen.ts. */
export const PVP_HP_SP_REGEN_INTERVAL_MS = 10_000

/** Fraction of max HP/SP restored each PVP passive regen tick (0.1 = 10%). */
export const PVP_HP_SP_REGEN_PERCENT = 0.1

export type PvpKillStreakKind = 'first_blood' | 'double' | 'triple' | 'ultra' | 'rampage'

export const PVP_KILL_STREAK_LABELS: Record<PvpKillStreakKind, string> = {
  first_blood: 'First Blood!',
  double: 'Double Kill!',
  triple: 'Triple Kill!',
  ultra: 'Ultra Kill!',
  rampage: 'Rampage!',
}

export function randomPvpRespawnPoint(rng = Math.random): { x: number; y: number } {
  const zone = PVP_ROOM_RESPAWN_ZONES[Math.floor(rng() * PVP_ROOM_RESPAWN_ZONES.length)]!
  return {
    x: zone.x + rng() * zone.width,
    y: zone.y + rng() * zone.height,
  }
}

export function streakKindForKillCount(count: number, firstBloodAvailable: boolean): PvpKillStreakKind | null {
  if (count <= 0) return null
  if (count === 1) return firstBloodAvailable ? 'first_blood' : null
  if (count === 2) return 'double'
  if (count === 3) return 'triple'
  if (count === 4) return 'ultra'
  return 'rampage'
}
