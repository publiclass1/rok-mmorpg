import assert from 'node:assert'
import { addExperience, createInitialCharacterState } from '../character/characterState'
import { addJobExp, progressFromLevels } from './exp'

function run() {
  const noviceAt10 = progressFromLevels(1, 0, 10, 0, 'novice')
  const noviceAfter = addJobExp(noviceAt10, 99_999, 'novice')
  assert.equal(noviceAfter.newState.jobLevel, 10, 'novice job level stays capped at 10')

  const swordmanAt10 = progressFromLevels(1, 0, 10, 0, 'swordman')
  const swordmanAfter = addJobExp(swordmanAt10, 99_999, 'swordman')
  assert.ok(swordmanAfter.newState.jobLevel > 10, 'swordman job level should pass 10')

  let session = createInitialCharacterState()
  session = {
    ...session,
    jobId: 'swordman',
    skillPointsUnspent: 0,
    progress: progressFromLevels(1, 0, 10, 0, 'swordman'),
  }
  const leveled = addExperience(session, 0, 99_999)
  assert.ok(leveled.jobLeveled >= 1, 'swordman should job level from kill exp')
  assert.ok(leveled.state.progress.jobLevel > 10, 'session job level should exceed 10')
  assert.ok(leveled.state.skillPointsUnspent >= 1, 'job level up should grant skill points')

  console.log('exp.test.ts: ok')
}

run()
