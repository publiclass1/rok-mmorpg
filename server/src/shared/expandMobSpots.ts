// @ts-nocheck
type MobSpawnSpotJson = {
  id: string
  x: number
  y: number
  width: number
  height: number
  defId: string
  count: number
  spawnsPerMinute: number
  canLure: boolean
  lureRadius?: number
}

export type RuntimeMobSpawn = {
  x: number
  y: number
  defId: string
}

const MIN_SPAWNS_PER_MINUTE = 1
const MAX_SPAWNS_PER_MINUTE = 600

function hash32(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function respawnMsFromSpawnsPerMinute(spawnsPerMinute: number): number {
  const rate = Math.max(MIN_SPAWNS_PER_MINUTE, Math.min(MAX_SPAWNS_PER_MINUTE, spawnsPerMinute))
  return Math.round(60_000 / rate)
}

function deterministicSpawnPosition(
  mapId: string,
  spotId: string,
  slotIndex: number,
  spot: Pick<MobSpawnSpotJson, 'x' | 'y' | 'width' | 'height'>,
): { x: number; y: number } {
  const h1 = hash32(`${mapId}:${spotId}:${slotIndex}:x`)
  const h2 = hash32(`${mapId}:${spotId}:${slotIndex}:y`)
  const fx = (h1 % 10_000) / 10_000
  const fy = (h2 % 10_000) / 10_000
  const margin = 4
  const innerW = Math.max(1, spot.width - margin * 2)
  const innerH = Math.max(1, spot.height - margin * 2)
  return {
    x: Math.round(spot.x + margin + fx * innerW),
    y: Math.round(spot.y + margin + fy * innerH),
  }
}

export function expandMobSpotsForMap(mapId: string, spots: MobSpawnSpotJson[]): RuntimeMobSpawn[] {
  const out: RuntimeMobSpawn[] = []
  for (const spot of spots) {
    const count = Math.max(1, Math.floor(spot.count))
    for (let slot = 0; slot < count; slot++) {
      const pos = deterministicSpawnPosition(mapId, spot.id, slot, spot)
      out.push({ x: pos.x, y: pos.y, defId: spot.defId })
    }
  }
  return out
}

export function mobSpawnsByMap(mobSpots: Record<string, MobSpawnSpotJson[]>): Record<string, RuntimeMobSpawn[]> {
  const result: Record<string, RuntimeMobSpawn[]> = {}
  for (const [mapId, spots] of Object.entries(mobSpots)) {
    result[mapId] = expandMobSpotsForMap(mapId, spots ?? [])
  }
  return result
}

export function respawnMsForMapSpot(
  mobSpots: Record<string, MobSpawnSpotJson[]>,
  mapId: string,
): number {
  const spots = mobSpots[mapId] ?? []
  if (spots.length === 0) return 8000
  return respawnMsFromSpawnsPerMinute(spots[0].spawnsPerMinute)
}
