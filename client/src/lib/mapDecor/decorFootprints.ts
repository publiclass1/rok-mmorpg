import { getDecorAsset } from './catalog'
import { readDecorAssetId } from './decorProps'
import type { TmjMapObject } from '../tmj/types'

export type WorldRect = { x: number; y: number; width: number; height: number }

export function rectsIntersect(a: WorldRect, b: WorldRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function objectBounds(obj: TmjMapObject): WorldRect {
  return {
    x: obj.x ?? 0,
    y: obj.y ?? 0,
    width: obj.width ?? 0,
    height: obj.height ?? 0,
  }
}

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

function isClearedByBridge(rect: WorldRect, clearZones: WorldRect[]): boolean {
  for (const zone of clearZones) {
    if (rectsIntersect(rect, zone)) return true
  }
  return false
}

export function decorFootprintRects(objects: TmjMapObject[]): WorldRect[] {
  const clearZones: WorldRect[] = []
  for (const obj of objects) {
    const assetId = readDecorAssetId(obj)
    if (!assetId) continue
    const def = getDecorAsset(assetId)
    if (def?.clearsBelow) clearZones.push(objectBounds(obj))
  }

  const rects: WorldRect[] = []
  for (const obj of objects) {
    const assetId = readDecorAssetId(obj)
    if (!assetId) continue
    const def = getDecorAsset(assetId)
    if (!def) continue
    const fps = def.footprints ?? (def.footprint ? [def.footprint] : [])
    for (const fp of fps) {
      const world = scaleFootprint(fp, obj, def.width)
      if (!def.clearsBelow && isClearedByBridge(world, clearZones)) continue
      rects.push(world)
    }
  }
  return rects
}
