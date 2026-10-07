import assert from 'node:assert/strict'
import {
  deterministicSpawnPosition,
  expandMobSpotsForMap,
  respawnMsFromSpawnsPerMinute,
} from './expandMobSpots'
import type { MobSpawnSpotJson } from './types'

const spot: MobSpawnSpotJson = {
  id: 'test_spot',
  x: 100,
  y: 100,
  width: 64,
  height: 64,
  defId: 'poring',
  count: 3,
  spawnsPerMinute: 10,
  canLure: true,
}

const expanded = expandMobSpotsForMap('field_01', [spot])
assert.equal(expanded.length, 3)
assert.equal(expanded[0].defId, 'poring')
assert.equal(expanded[0].respawnMs, respawnMsFromSpawnsPerMinute(10))
assert.equal(respawnMsFromSpawnsPerMinute(7.5), 8000)

const a = deterministicSpawnPosition('field_01', 'test_spot', 0, spot)
const b = deterministicSpawnPosition('field_01', 'test_spot', 0, spot)
assert.equal(a.x, b.x)
assert.equal(a.y, b.y)
assert.ok(a.x >= spot.x && a.x <= spot.x + spot.width)
assert.ok(a.y >= spot.y && a.y <= spot.y + spot.height)

console.log('expandMobSpots.test.ts OK')
