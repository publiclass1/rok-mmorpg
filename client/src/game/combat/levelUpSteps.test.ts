import assert from 'node:assert'
import { buildLevelUpSteps } from './levelUpSteps'

function run() {
  assert.deepEqual(buildLevelUpSteps(0, 0, 5, 10), [])

  assert.deepEqual(buildLevelUpSteps(2, 0, 8, 20), [
    { kind: 'base', level: 9 },
    { kind: 'base', level: 10 },
  ])

  assert.deepEqual(buildLevelUpSteps(1, 2, 1, 5), [
    { kind: 'base', level: 2 },
    { kind: 'job', level: 6 },
    { kind: 'job', level: 7 },
  ])

  console.log('levelUpSteps.test.ts: ok')
}

run()
