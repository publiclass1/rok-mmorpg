import type { MapPortalDef } from '../../content/ro/types'
import type { DecorAssetId } from '../mapDecor/catalog'
import { createDecorPlacement } from '../mapDecor/decorProps'
import { readPortalProps } from './properties'
import type { TmjMap, TmjMapObject, TmjObjectGroup, TmjTileLayer } from './types'

export function parseTmj(raw: unknown): TmjMap {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid TMJ: not an object')
  }
  const map = raw as TmjMap
  if (map.type !== 'map') throw new Error('Invalid TMJ: type must be "map"')
  if (!Array.isArray(map.layers)) throw new Error('Invalid TMJ: missing layers')
  return map
}

export function getTileLayer(map: TmjMap, name: string): TmjTileLayer | null {
  const layer = map.layers.find((l) => l.type === 'tilelayer' && l.name === name)
  return layer && layer.type === 'tilelayer' ? layer : null
}

export function getObjectGroup(map: TmjMap, name: string): TmjObjectGroup | null {
  const layer = map.layers.find((l) => l.type === 'objectgroup' && l.name === name)
  return layer && layer.type === 'objectgroup' ? layer : null
}

export function ensureObjectGroups(map: TmjMap): void {
  if (!getObjectGroup(map, 'obstacles')) {
    const id = map.nextlayerid++
    map.layers.push({
      id,
      name: 'obstacles',
      opacity: 1,
      type: 'objectgroup',
      visible: true,
      x: 0,
      y: 0,
      objects: [],
    })
  }
  if (!getObjectGroup(map, 'portals')) {
    const id = map.nextlayerid++
    map.layers.push({
      id,
      name: 'portals',
      opacity: 1,
      type: 'objectgroup',
      visible: true,
      x: 0,
      y: 0,
      objects: [],
    })
  }
  if (!getObjectGroup(map, 'decor')) {
    const id = map.nextlayerid++
    map.layers.push({
      id,
      name: 'decor',
      opacity: 1,
      type: 'objectgroup',
      visible: true,
      x: 0,
      y: 0,
      objects: [],
    })
  }
}

export function addDecorToMap(map: TmjMap, assetId: DecorAssetId, centerX: number, centerY: number): TmjMap {
  ensureObjectGroups(map)
  const obj = createDecorPlacement(map, assetId, centerX, centerY)
  const nextId = map.nextobjectid + 1
  return {
    ...map,
    nextobjectid: nextId,
    layers: map.layers.map((layer) => {
      if (layer.type !== 'objectgroup' || layer.name !== 'decor') return layer
      return { ...layer, objects: [...layer.objects, obj] }
    }),
  }
}

export function nextObjectId(map: TmjMap): number {
  const id = map.nextobjectid
  map.nextobjectid += 1
  return id
}

export function obstacleDefsFromMap(map: TmjMap): Array<{ x: number; y: number; width: number; height: number }> {
  const group = getObjectGroup(map, 'obstacles')
  if (!group) return []
  return group.objects
    .filter((o) => o.type === 'obstacle' || o.type === '')
    .map((o) => ({
      x: o.x + o.width / 2,
      y: o.y + o.height / 2,
      width: o.width,
      height: o.height,
    }))
}

export function portalDefsFromMap(map: TmjMap, _mapId: string): MapPortalDef[] {
  const group = getObjectGroup(map, 'portals')
  if (!group) return []
  return group.objects
    .filter((o) => o.type === 'portal' || o.properties?.some((p) => p.name === 'portalId'))
    .map((o) => {
      const p = readPortalProps(o)
      return {
        id: p.portalId,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        targetMapId: p.targetMapId,
        targetX: p.targetX,
        targetY: p.targetY,
        label: p.label,
        mode: p.mode,
      }
    })
}

export function createObstacleObject(map: TmjMap, x: number, y: number, width: number, height: number): TmjMapObject {
  return {
    id: nextObjectId(map),
    name: `obstacle_${map.nextobjectid}`,
    type: 'obstacle',
    x,
    y,
    width,
    height,
  }
}
