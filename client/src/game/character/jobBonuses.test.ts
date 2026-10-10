import assert from 'node:assert'
import { jobLevelStatBonus } from './jobBonuses'
import { addExperience, createInitialCharacterState } from './characterState'
import { effectiveStats } from './effectiveStats'
import { progressFromLevels } from '../combat/exp'

function run() {
  assert.deepEqual(jobLevelStatBonus('novice', 10), { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 })

  assert.equal(jobLevelStatBonus('swordman', 1).str, 0)
  assert.equal(jobLevelStatBonus('swordman', 2).str, 1)
  assert.equal(jobLevelStatBonus('swordman', 50).str, 7)
  assert.equal(jobLevelStatBonus('swordman', 50).vit, 4)

  const knightAt1 = jobLevelStatBonus('knight', 1)
  assert.equal(knightAt1.vit, 1)
  const swordAt50 = jobLevelStatBonus('swordman', 50)
  assert.ok(swordAt50.str > knightAt1.str || knightAt1.vit > 0, 'job tables differ by class')

  let session = {
    ...createInitialCharacterState(),
    jobId: 'swordman',
    str: 1,
    progress: progressFromLevels(1, 0, 1, 0, 'swordman'),
  }
  const beforeEff = effectiveStats(session).str
  session = addExperience(session, 0, 99_999).state
  const afterEff = effectiveStats(session).str
  assert.equal(session.str, 1, 'allocated STR unchanged on job level')
  assert.ok(afterEff > beforeEff, 'effective STR rises from job bonuses')

  console.log('jobBonuses.test.ts: ok')
}

run()
