import { describe, expect, it } from 'vitest'
import { findPortalAtPoint, getWalkPortalsForMap } from './mapPortals'

describe('dungeon exit portals', () => {
  for (const mapId of ['dun_f1', 'dun_f2', 'dun_f3', 'dun_f4', 'dun_f5']) {
    it(`${mapId} has no walk-through exit at southern mob lane`, () => {
      expect(getWalkPortalsForMap(mapId)).toHaveLength(0)
      expect(findPortalAtPoint(mapId, 512, 1248)).toBeNull()
    })
  }
})
