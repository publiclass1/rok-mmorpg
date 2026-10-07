import { getDecorAsset } from './catalog'
import { readDecorAssetId } from './decorProps'
import type { TmjMapObject } from '../tmj/types'

export type WorldRect = { x: number; y: number; width: number; height: number }

function scaleFootprint(
  fp: { x: number; y: number; width: number; height: number },
  obj: TmjMapObject,
  nativeW: number,
): WorldRect {
  const scale = (obj.width ?? nativeW) / nativeW
  const ox = obj.x ?? 0
  const oy = obj.y ?? 0
  return {
    x: ox + fp.x * scale,
    y: oy + fp.y * scale,
    width: fp.width * scale,
    height: fp.height * scale,
  }
}

export function decorFootprintRects(objects: TmjMapObject[]): WorldRect[] {
  const rects: WorldRect[] = []
  for (const obj of objects) {
    const assetId = readDecorAssetId(obj)
    if (!assetId) continue
    const def = getDecorAsset(assetId)
    if (!def) continue
    const fps = def.footprints ?? (def.footprint ? [def.footprint] : [])
    for (const fp of fps) {
      rects.push(scaleFootprint(fp, obj, def.width))
    }
  }
  return rects
}
