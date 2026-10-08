import assert from 'node:assert'
import { findPortalAtPoint, getWalkPortalsForMap } from './mapPortals'

function run() {
  for (const mapId of ['dun_f1', 'dun_f2', 'dun_f3', 'dun_f4', 'dun_f5']) {
    const walk = getWalkPortalsForMap(mapId)
    assert.equal(walk.length, 1, `${mapId} should have one walk exit`)
    const exit = walk[0]
    assert.ok(exit.y < 200, `${mapId} exit should be near map top`)
    assert.deepEqual(
      findPortalAtPoint(mapId, exit.x + exit.width / 2, exit.y + exit.height / 2),
      exit,
    )
    assert.equal(findPortalAtPoint(mapId, 512, 1248), null)
  }
  console.log('mapPortals.test.ts: ok')
}

run()
