import type { TmjMapObject } from '../tmj/types'
import { getObjectProperty, setObjectProperties } from '../tmj/properties'
import type { DecorAssetId } from './catalog'
import { getDecorAsset } from './catalog'

export function readDecorAssetId(obj: TmjMapObject): DecorAssetId | null {
  const raw = obj.properties
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const id = (raw as Record<string, unknown>).assetId
    if (typeof id === 'string' && getDecorAsset(id)) return id as DecorAssetId
  }
  const fromProp = getObjectProperty(obj, 'assetId')
  if (typeof fromProp === 'string' && getDecorAsset(fromProp)) {
    return fromProp as DecorAssetId
  }
  if (obj.type === 'decor' && getDecorAsset(obj.name)) {
    return obj.name as DecorAssetId
  }
  return null
}

export function writeDecorObject(obj: TmjMapObject, assetId: DecorAssetId, x: number, y: number): void {
  const def = getDecorAsset(assetId)
  if (!def) return
  obj.type = 'decor'
  obj.name = assetId
  obj.x = Math.round(x)
  obj.y = Math.round(y)
  obj.width = def.width
  obj.height = def.height
  setObjectProperties(obj, { assetId })
}

export function createDecorPlacement(
  map: { nextobjectid: number },
  assetId: DecorAssetId,
  centerX: number,
  centerY: number,
): TmjMapObject {
  const def = getDecorAsset(assetId)!
  const id = map.nextobjectid
  const obj: TmjMapObject = {
    id,
    name: assetId,
    type: 'decor',
    x: Math.round(centerX - def.width / 2),
    y: Math.round(centerY - def.height / 2),
    width: def.width,
    height: def.height,
  }
  writeDecorObject(obj, assetId, obj.x, obj.y)
  return obj
}
