import assert from 'node:assert/strict'
import {
  createInitialCharacterState,
  raiseStat,
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

console.log('characterState.reset.test.ts: ok')
