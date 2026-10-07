import assert from 'node:assert'
import { REMOTE_SNAP_DISTANCE_PX, shouldSnapRemotePosition } from './remotePositionSnap'

assert.strictEqual(shouldSnapRemotePosition(0, 0, 10, 0), false)
assert.strictEqual(shouldSnapRemotePosition(0, 0, REMOTE_SNAP_DISTANCE_PX, 0), false)
assert.strictEqual(shouldSnapRemotePosition(0, 0, REMOTE_SNAP_DISTANCE_PX + 1, 0), true)
assert.strictEqual(shouldSnapRemotePosition(100, 100, 100, 100 + REMOTE_SNAP_DISTANCE_PX + 5), true)

console.log('remotePlayers.test.ts: ok')
