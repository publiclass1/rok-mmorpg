import assert from 'node:assert/strict'
import { MAP_TILE_SIZE } from '../combat/playerAttackRange'
import {
  falconCompanionWingPhase,
  FALCON_HEAD_CLEARANCE_PX,
  FALCON_HOVER_OFFSET_Y,
  FALCON_TILES_ABOVE_HEAD,
} from './falconCompanionVisual'

assert.equal(FALCON_TILES_ABOVE_HEAD, 4)
assert.equal(
  FALCON_HOVER_OFFSET_Y,
  -(FALCON_HEAD_CLEARANCE_PX + FALCON_TILES_ABOVE_HEAD * MAP_TILE_SIZE),
)
assert.equal(FALCON_HOVER_OFFSET_Y, -154)

const idleFlap = falconCompanionWingPhase(0, 'idle')
assert.ok(idleFlap >= 0 && idleFlap <= 1)
assert.ok(falconCompanionWingPhase(80, 'idle') > idleFlap, 'idle wing phase animates over time')

console.log('falconCompanionVisual.test.ts: ok')
