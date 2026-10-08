import assert from 'node:assert/strict'
import {
  clampWorldYScale,
  WORLD_Y_SCALE_DEFAULT,
  WORLD_Y_SCALE_MAX,
  WORLD_Y_SCALE_MIN,
} from './worldViewPerspectiveConfig'

assert.equal(clampWorldYScale(1), 1)
assert.equal(clampWorldYScale(WORLD_Y_SCALE_MAX), WORLD_Y_SCALE_MAX)
assert.equal(clampWorldYScale(WORLD_Y_SCALE_MIN), WORLD_Y_SCALE_MIN)
assert.equal(clampWorldYScale(0.1), WORLD_Y_SCALE_MIN)
assert.equal(clampWorldYScale(2), WORLD_Y_SCALE_MAX)
assert.equal(clampWorldYScale(Number.NaN), WORLD_Y_SCALE_DEFAULT)

console.log('worldViewPerspective.test.ts: ok')
