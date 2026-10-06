export type DecorAssetId = 'river' | 'lake' | 'stones' | 'tree' | 'house'

export type DecorAssetDef = {
  id: DecorAssetId
  label: string
  /** Public URL path */
  src: string
  width: number
  height: number
  /** Sort with Y (feet); false = flat on ground (water) */
  ySort: boolean
}

export const DECOR_ASSETS: DecorAssetDef[] = [
  { id: 'river', label: 'River', src: '/maps/decor/river.svg', width: 128, height: 48, ySort: false },
  { id: 'lake', label: 'Lake', src: '/maps/decor/lake.svg', width: 128, height: 96, ySort: false },
  { id: 'stones', label: 'Stones', src: '/maps/decor/stones.svg', width: 64, height: 48, ySort: true },
  { id: 'tree', label: 'Tree', src: '/maps/decor/tree.svg', width: 64, height: 96, ySort: true },
  { id: 'house', label: 'House', src: '/maps/decor/house.svg', width: 96, height: 80, ySort: true },
]

export const DECOR_DRAG_MIME = 'application/x-map-decor-asset'

export function getDecorAsset(id: string): DecorAssetDef | undefined {
  return DECOR_ASSETS.find((a) => a.id === id)
}
