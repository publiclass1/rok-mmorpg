import { loadRoContent } from '../../content/ro/loadContent'

export function mapDisplayName(mapId: string): string {
  const map = loadRoContent().maps.find((m) => m.id === mapId)
  return map?.displayName ?? mapId
}
