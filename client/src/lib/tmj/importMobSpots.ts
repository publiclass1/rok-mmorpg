import type { MobSpawnSpotJson } from '../../content/ro/types'
import { defaultLureRadius } from '../../content/ro/expandMobSpots'
import { ensureObjectGroups } from './parse'
import { writeMobSpotProps } from './properties'
import type { MobSpotObjectProps, TmjMap, TmjMapObject } from './types'

function mobSpotObjectFromDef(map: TmjMap, spot: MobSpawnSpotJson): TmjMapObject {
  const id = map.nextobjectid
  map.nextobjectid += 1
  const lureRadius = spot.lureRadius ?? (spot.canLure ? defaultLureRadius(spot) : 0)
  const props: MobSpotObjectProps = {
    spotId: spot.id,
    defId: spot.defId,
    count: spot.count,
    spawnsPerMinute: spot.spawnsPerMinute,
    canLure: spot.canLure,
    lureRadius,
  }
  const obj: TmjMapObject = {
    id,
    name: spot.id,
    type: 'mob_spot',
    x: spot.x,
    y: spot.y,
    width: spot.width,
    height: spot.height,
  }
  writeMobSpotProps(obj, props)
  return obj
}

/** Replace TMJ mob_spots layer from maps.json spots (content is source of truth on load). */
export function importMobSpotsIntoMap(map: TmjMap, spots: MobSpawnSpotJson[]): TmjMap {
  const draft: TmjMap = structuredClone(map)
  ensureObjectGroups(draft)
  const objects = spots.map((spot) => mobSpotObjectFromDef(draft, spot))
  return {
    ...draft,
    layers: draft.layers.map((layer) => {
      if (layer.type !== 'objectgroup' || layer.name !== 'mob_spots') return layer
      return { ...layer, objects }
    }),
  }
}
