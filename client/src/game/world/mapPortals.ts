import { loadRoContent } from '../../content/ro/loadContent'
import type { MapPortalDef } from '../../content/ro/types'

export function getWalkPortalsForMap(mapId: string): MapPortalDef[] {
  const list = loadRoContent().portals[mapId] ?? []
  return list.filter((p) => p.mode === 'walk' || p.mode === 'both')
}

export function findPortalAtPoint(mapId: string, x: number, y: number): MapPortalDef | null {
  for (const portal of getWalkPortalsForMap(mapId)) {
    if (
      x >= portal.x &&
      x <= portal.x + portal.width &&
      y >= portal.y &&
      y <= portal.y + portal.height
    ) {
      return portal
    }
  }
  return null
}
