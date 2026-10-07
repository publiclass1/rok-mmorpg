import assert from 'node:assert'
import { trimPathFromPlayer } from './gridPathfind'

function run() {
  const path = [
    { x: 16, y: 16 },
    { x: 48, y: 16 },
    { x: 100, y: 16 },
  ]

  const trimmed = trimPathFromPlayer(path, 27, 16)
  assert.equal(trimmed.length, 2)
  assert.equal(trimmed[0].x, 48)
  assert.equal(trimmed[0].y, 16)
  assert.equal(trimmed[1].x, 100)

  const nearPlayer = trimPathFromPlayer(path, 17, 16)
  assert.equal(nearPlayer[0].x, 48, 'skip tile center when within near threshold')

  const atGoal = trimPathFromPlayer([{ x: 50, y: 50 }], 50, 50)
  assert.deepEqual(atGoal, [{ x: 50, y: 50 }])

  assert.deepEqual(trimPathFromPlayer([], 0, 0), [])

  console.log('gridPathfind.test.ts: ok')
}

run()
