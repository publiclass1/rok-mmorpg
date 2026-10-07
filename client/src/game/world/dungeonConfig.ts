import { loadRoContent } from '../../content/ro/loadContent'
import type { RoDungeonFloor } from '../../content/ro/types'

const DUNGEON_MAP_IDS = new Set<string>()

function ensureCache() {
  const ro = loadRoContent()
  for (const f of ro.dungeons.floors) {
    DUNGEON_MAP_IDS.add(f.mapId)
  }
}

export function isDungeonMapId(mapId: string): boolean {
  ensureCache()
  return DUNGEON_MAP_IDS.has(mapId)
}

export function dungeonFloorByMapId(mapId: string): RoDungeonFloor | null {
  const ro = loadRoContent()
  return ro.dungeons.floors.find((f) => f.mapId === mapId) ?? null
}

export function dungeonFloors(): RoDungeonFloor[] {
  return loadRoContent().dungeons.floors
}
