import { loadRoContent } from '../../content/ro/loadContent'

export type WarpDestination = {
  map_id: string
  label: string
  x: number
  y: number
  category?: string
}

export function isCustomWarpDestination(dest: WarpDestination): boolean {
  if (dest.category === 'custom') return true
  const map = loadRoContent().maps.find((m) => m.id === dest.map_id)
  return map?.fieldType === 'custom'
}
