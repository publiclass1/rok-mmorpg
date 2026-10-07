import { resizeTileLayerData } from './tileDefaults'
import type { TmjMap, TmjTileLayer } from './types'

const MIN_SIZE = 5
const MAX_SIZE = 200

export function clampMapDimension(n: number): number {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(n)))
}

export function resizeTmjMap(map: TmjMap, newWidth: number, newHeight: number): TmjMap {
  const w = clampMapDimension(newWidth)
  const h = clampMapDimension(newHeight)
  const oldW = map.width
  const oldH = map.height
  if (w === oldW && h === oldH) return map

  const next: TmjMap = {
    ...map,
    width: w,
    height: h,
    layers: map.layers.map((layer) => {
      if (layer.type !== 'tilelayer') return layer
      const tileLayer = layer as TmjTileLayer
      return {
        ...tileLayer,
        width: w,
        height: h,
        data: resizeTileLayerData(tileLayer, oldW, oldH, w, h),
      }
    }),
  }
  return next
}
