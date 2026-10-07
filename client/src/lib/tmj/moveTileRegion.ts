import { defaultTileValueForLayer } from './tileDefaults'
import type { TmjMap, TmjTileLayer } from './types'

export type TileRegion = {
  tx: number
  ty: number
  tw: number
  th: number
}

function getTile(map: TmjMap, layer: TmjTileLayer, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return defaultTileValueForLayer(layer.name)
  return layer.data[ty * map.width + tx]
}

function setTile(data: number[], mapW: number, tx: number, ty: number, value: number): void {
  data[ty * mapW + tx] = value
}

/**
 * Cut tile region from all tilelayers, fill source with defaults, paste at offset (clipped).
 */
export function moveTileRegion(map: TmjMap, region: TileRegion, dtx: number, dty: number): TmjMap {
  if (dtx === 0 && dty === 0) return map
  const { tx, ty, tw, th } = region
  if (tw <= 0 || th <= 0) return map

  const destTx = tx + dtx
  const destTy = ty + dty

  const next: TmjMap = {
    ...map,
    layers: map.layers.map((layer) => {
      if (layer.type !== 'tilelayer') return layer
      const tileLayer = layer as TmjTileLayer
      const data = [...tileLayer.data]
      const defaultVal = defaultTileValueForLayer(tileLayer.name)

      const extracted: number[][] = []
      for (let ry = 0; ry < th; ry++) {
        const row: number[] = []
        for (let rx = 0; rx < tw; rx++) {
          row.push(getTile(map, tileLayer, tx + rx, ty + ry))
        }
        extracted.push(row)
      }

      for (let ry = 0; ry < th; ry++) {
        for (let rx = 0; rx < tw; rx++) {
          const sx = tx + rx
          const sy = ty + ry
          if (sx >= 0 && sy >= 0 && sx < map.width && sy < map.height) {
            setTile(data, map.width, sx, sy, defaultVal)
          }
        }
      }

      for (let ry = 0; ry < th; ry++) {
        for (let rx = 0; rx < tw; rx++) {
          const dx = destTx + rx
          const dy = destTy + ry
          if (dx >= 0 && dy >= 0 && dx < map.width && dy < map.height) {
            setTile(data, map.width, dx, dy, extracted[ry][rx])
          }
        }
      }

      return { ...tileLayer, data }
    }),
  }
  return next
}
