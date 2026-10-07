import assert from 'node:assert'
import {
  COMBAT_AIM_Y_OFFSET,
  projectileTravelMs,
  toCombatAimPoint,
} from './rangedProjectileFx'

function run() {
  assert.equal(toCombatAimPoint(100, 50).y, 50 - COMBAT_AIM_Y_OFFSET)
  assert.equal(toCombatAimPoint(100, 50).x, 100)

  assert.equal(projectileTravelMs(0), 120)
  assert.equal(projectileTravelMs(10), 120)
  assert.equal(projectileTravelMs(50), 140)
  assert.equal(projectileTravelMs(200), 380)
  assert.equal(projectileTravelMs(500), 380)
}

run()
console.log('rangedProjectileFx.test.ts: ok')
