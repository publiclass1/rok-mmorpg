import type { MobSpawnSpotJson } from './types'

export type RuntimeMobSpawn = {
  x: number
  y: number
  defId: string
  spotId: string
  spotCenterX: number
  spotCenterY: number
  respawnMs: number
  canLure: boolean
  lureRadius: number
  spotRect: { x: number; y: number; width: number; height: number }
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

export function respawnMsFromSpawnsPerMinute(spawnsPerMinute: number): number {
  const rate = Math.max(MIN_SPAWNS_PER_MINUTE, Math.min(MAX_SPAWNS_PER_MINUTE, spawnsPerMinute))
  return Math.round(60_000 / rate)
}

export function defaultLureRadius(spot: Pick<MobSpawnSpotJson, 'width' | 'height'>): number {
  return Math.max(spot.width, spot.height) * 1.5
}

export function deterministicSpawnPosition(
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
    const centerX = spot.x + spot.width / 2
    const centerY = spot.y + spot.height / 2
    const lureRadius = spot.lureRadius ?? defaultLureRadius(spot)
    const respawnMs = respawnMsFromSpawnsPerMinute(spot.spawnsPerMinute)
    const spotRect = { x: spot.x, y: spot.y, width: spot.width, height: spot.height }
    for (let slot = 0; slot < count; slot++) {
      const pos = deterministicSpawnPosition(mapId, spot.id, slot, spot)
      out.push({
        x: pos.x,
        y: pos.y,
        defId: spot.defId,
        spotId: spot.id,
        spotCenterX: centerX,
        spotCenterY: centerY,
        respawnMs,
        canLure: spot.canLure,
        lureRadius,
        spotRect,
      })
    }
  }
  return out
}

export function expandAllMobSpots(
  mobSpots: Record<string, MobSpawnSpotJson[]>,
): Record<string, RuntimeMobSpawn[]> {
  const out: Record<string, RuntimeMobSpawn[]> = {}
  for (const [mapId, spots] of Object.entries(mobSpots)) {
    out[mapId] = expandMobSpotsForMap(mapId, spots)
  }
  return out
}

/** Legacy point → spot for one-time maps.json migration. */
export function legacyPointToSpot(
  mapId: string,
  index: number,
  point: { x: number; y: number; defId: string },
): MobSpawnSpotJson {
  const size = 32
  return {
    id: `${mapId}_spot_${index}`,
    x: point.x - size / 2,
    y: point.y - size / 2,
    width: size,
    height: size,
    defId: point.defId,
    count: 1,
    spawnsPerMinute: 7.5,
    canLure: true,
  }
}
