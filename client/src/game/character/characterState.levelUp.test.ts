import assert from 'node:assert'
import { addExperience, createInitialCharacterState } from './characterState'
import { derivedMaxHp } from './statFormulas'
import { effectiveStats } from './effectiveStats'
import { progressFromLevels } from '../combat/exp'
import { toCharacterSheetPayload } from './characterSheet'

function run() {
  let session = createInitialCharacterState()
  session = { ...session, hp: 30, mp: 10 }
  const beforeSheet = toCharacterSheetPayload(session)
  const leveled = addExperience(session, 9999, 0)
  assert.ok(leveled.baseLeveled >= 1, 'should gain base levels from exp')
  const afterSheet = toCharacterSheetPayload(leveled.state)
  assert.ok(afterSheet.hpMax > beforeSheet.hpMax, 'base level up should raise max HP')
  assert.equal(afterSheet.hp, afterSheet.hpMax, 'base level up should restore HP to full')
  assert.equal(afterSheet.mp, afterSheet.mpMax, 'base level up should restore SP to full')
  assert.ok(leveled.state.statPointsUnspent > 0, 'base level up should grant stat points')

  let jobSession = {
    ...createInitialCharacterState(),
    jobId: 'swordman',
    skillPointsUnspent: 0,
    progress: progressFromLevels(1, 0, 10, 0, 'swordman'),
  }
  const hpBefore = derivedMaxHp(jobSession.jobId, jobSession.progress.baseLevel, jobSession.vit)
  const jobLeveled = addExperience(jobSession, 0, 99_999)
  assert.ok(jobLeveled.jobLeveled >= 1, 'should job level')
  const hpAfter = derivedMaxHp(
    jobLeveled.state.jobId,
    jobLeveled.state.progress.baseLevel,
    jobLeveled.state.vit,
  )
  assert.equal(hpAfter, hpBefore, 'job level alone should not change max HP')
  assert.ok(jobLeveled.state.skillPointsUnspent >= 1, 'job level up should grant skill points')
  const effStr = effectiveStats(jobLeveled.state).str
  assert.ok(effStr > jobSession.str, 'job level up should raise effective stats via job bonuses')

  console.log('characterState.levelUp.test.ts: ok')
}

run()
