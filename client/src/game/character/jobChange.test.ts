import assert from 'node:assert/strict'
import {
  applyJobChange,
  jobChangeOffersForCurrentJob,
  jobChangeOffersForNpc,
} from './jobChange'
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

const pronteraOffers = jobChangeOffersForNpc('prontera_job_master', null)
const noviceVisible = jobChangeOffersForCurrentJob(pronteraOffers, 'novice')
const noviceIds = noviceVisible.map((o) => o.jobId)
assert.equal(noviceVisible.length, 6, 'novice sees six 1st jobs')
assert.ok(noviceIds.includes('swordman'))
assert.equal(noviceIds.includes('knight'), false, 'novice does not see knight')
assert.equal(noviceIds.includes('hunter'), false, 'novice does not see hunter')
assert.equal(noviceIds.includes('wizard'), false, 'novice does not see wizard')

const swordmanVisible = jobChangeOffersForCurrentJob(pronteraOffers, 'swordman')
assert.equal(swordmanVisible.length, 1)
assert.equal(swordmanVisible[0]?.jobId, 'knight')

const archerWithSkills = {
  ...base,
  jobId: 'archer',
  progress: { ...base.progress, jobLevel: 40, baseLevel: 40 },
  skills: { ...base.skills, double_strafe: 5, owls_eye: 5 },
}
const hunterState = applyJobChange(archerWithSkills, 'hunter')
assert.equal(hunterState.jobId, 'hunter')
assert.equal(hunterState.skills.double_strafe, 5, 'retains archer skills')
assert.equal(hunterState.skills.owls_eye, 5, 'retains archer passives')

console.log('jobChange.test.ts: ok')
