import assert from 'node:assert/strict'
import { applyJobChange } from './jobChange'
import { createInitialCharacterState } from './characterState'

const base = createInitialCharacterState()

const swordmanWithBash = {
  ...base,
  jobId: 'swordman',
  progress: { ...base.progress, jobLevel: 40, baseLevel: 40 },
  skills: { ...base.skills, bash: 5, sword_mastery: 3 },
}

const knightState = applyJobChange(swordmanWithBash, 'knight')

assert.equal(knightState.jobId, 'knight')
assert.equal(knightState.skills.bash, 5, 'retains swordman bash')
assert.equal(knightState.skills.sword_mastery, 3, 'retains swordman passives')
assert.equal(knightState.progress.jobLevel, 1)
assert.equal(knightState.equipment.weapon != null, true, 'starter weapon equipped')
assert.ok(knightState.equipment.weapon?.startsWith('ri:spear:'), 'knight kit spear')

const noviceToSword = applyJobChange(
  { ...base, jobId: 'novice', progress: { ...base.progress, jobLevel: 10 } },
  'swordman',
)
assert.equal(noviceToSword.skills.bash ?? 0, 0, '1st job strips prior skills')
assert.equal(noviceToSword.equipment.weapon?.startsWith('ri:sword:'), true)

console.log('jobChange.test.ts: ok')
