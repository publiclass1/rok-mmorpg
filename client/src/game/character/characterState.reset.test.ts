import assert from 'node:assert/strict'
import { applyJobChange } from './jobChange'
import {
  createInitialCharacterState,
  raiseStat,
  reconcileProgressBudgetForSave,
  resetAllocatedPrimaryStats,
  resetAllocatedSkills,
} from './characterState'
import { statRaiseCost } from './statFormulas'
const base = createInitialCharacterState()

let withStats = { ...base, statPointsUnspent: 100 }
withStats = raiseStat(withStats, 'str')
withStats = raiseStat(withStats, 'str')
withStats = raiseStat(withStats, 'vit')
const spentOnStr = statRaiseCost(1) + statRaiseCost(2)
const spentOnVit = statRaiseCost(1)
const spentTotal = spentOnStr + spentOnVit
const unspentBeforeReset = withStats.statPointsUnspent

const afterStatReset = resetAllocatedPrimaryStats(withStats)
assert.equal(afterStatReset.str, 1)
assert.equal(afterStatReset.agi, 1)
assert.equal(afterStatReset.vit, 1)
assert.equal(
  afterStatReset.statPointsUnspent,
  unspentBeforeReset + spentTotal,
  'refunds all spent stat points',
)

const withSkills = {
  ...base,
  skillPointsUnspent: 2,
  skills: { ...base.skills, bash: 4 },
}
const skillSpent = 4
const skillUnspentBefore = withSkills.skillPointsUnspent

const afterSkillReset = resetAllocatedSkills(withSkills)
assert.equal(afterSkillReset.skills.bash ?? 0, 0)
assert.equal(afterSkillReset.skills.basic_attack, 1)
assert.equal(afterSkillReset.skills.sit, 1)
assert.equal(
  afterSkillReset.skillPointsUnspent,
  skillUnspentBefore + skillSpent,
  'refunds skill points above free levels',
)

const swordmanWithBash = {
  ...base,
  jobId: 'swordman',
  progress: { ...base.progress, jobLevel: 40, baseLevel: 40 },
  skills: { ...base.skills, bash: 5, sword_mastery: 3 },
  skillPointsUnspent: 0,
}
const knightWithInherited = applyJobChange(swordmanWithBash, 'knight')
const knightJobLevel = 15
const knightWithKnightSkill = {
  ...knightWithInherited,
  progress: { ...knightWithInherited.progress, jobLevel: knightJobLevel },
  skills: { ...knightWithInherited.skills, bowling_bash: 4 },
  skillPointsUnspent: 0,
}

const afterKnightReset = reconcileProgressBudgetForSave(resetAllocatedSkills(knightWithKnightSkill))
assert.equal(afterKnightReset.skills.bash ?? 0, 0, 'clears inherited 1st job skills')
assert.equal(afterKnightReset.skills.sword_mastery ?? 0, 0, 'clears inherited passives')
assert.equal(afterKnightReset.skills.bowling_bash ?? 0, 0, 'clears current job skills')
assert.equal(afterKnightReset.skills.basic_attack, 1)
assert.equal(afterKnightReset.skills.sit, 1)
assert.equal(
  afterKnightReset.skillPointsUnspent,
  knightJobLevel - 1,
  'unspent matches current job earned pool after full reset',
)

console.log('characterState.reset.test.ts: ok')
