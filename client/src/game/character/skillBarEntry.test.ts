import assert from 'node:assert'
import { createInitialCharacterState } from './characterState'
import { canPlaceOnSkillBar, isSkillBarConsumable } from './skillBarEntry'

function run() {
  assert.equal(isSkillBarConsumable('blue_potion'), true)
  assert.equal(isSkillBarConsumable('basic_attack'), false)
  assert.equal(isSkillBarConsumable('knife'), false)

  const state = createInitialCharacterState()
  assert.equal(canPlaceOnSkillBar('blue_potion', state.jobId, state.skills), true)
  assert.equal(canPlaceOnSkillBar('bash', state.jobId, state.skills), false)

  console.log('skillBarEntry.test.ts: ok')
}

run()
