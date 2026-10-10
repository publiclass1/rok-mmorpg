import assert from 'node:assert/strict'
import { SKILLS, skillsForJob, skillWindowTabs } from './skillsConfig'
import { computeSkillTreeLayout, hasIntraJobPrereqEdges } from './skillTreeLayout'

const swordman = skillsForJob('swordman')
assert.equal(hasIntraJobPrereqEdges(swordman), true, 'swordman has magnum → bash')

const swordLayout = computeSkillTreeLayout(swordman)
assert.equal(swordLayout.mode, 'tree')
const magnumPos = swordLayout.positions.magnum
const bashPos = swordLayout.positions.bash
assert.ok(magnumPos && bashPos, 'magnum and bash positioned')
assert.ok(magnumPos.row > bashPos.row, 'magnum below bash (iRO top-down tree)')
assert.equal(magnumPos.col, bashPos.col, 'magnum centered under bash')

const knight = skillsForJob('knight')
const knightLayout = computeSkillTreeLayout(knight)
assert.equal(knightLayout.mode, 'tree')
const spearMastery = knightLayout.positions.spear_mastery
const brandish = knightLayout.positions.brandish_spear
assert.ok(spearMastery && brandish, 'spear branch nodes')
assert.ok(brandish.row > spearMastery.row, 'brandish below spear mastery')
const stabPos = knightLayout.positions.spear_stab
const boomPos = knightLayout.positions.spear_boomerang
assert.ok(stabPos && boomPos, 'spear mastery children')
assert.ok(
  spearMastery.col >= brandish.col && spearMastery.col <= boomPos.col,
  'spear mastery centered over spear branch',
)

const acolyte = skillsForJob('acolyte')
const acolyteLayout = computeSkillTreeLayout(acolyte)
assert.equal(acolyteLayout.mode, 'tree')
assert.equal(acolyteLayout.rows, 1, 'single-row tree for lone skill')

assert.ok(SKILLS.heal, 'fixture skill heal exists')

assert.deepEqual(skillWindowTabs('archer'), ['archer'], 'archer sees only archer tab')
assert.deepEqual(skillWindowTabs('hunter'), ['archer', 'hunter'], 'hunter sees archer + hunter tabs')
const archerIds = new Set(skillsForJob('archer').map((s) => s.id))
const hunterOnly = skillsForJob('hunter').filter((s) => !archerIds.has(s.id))
assert.ok(
  !hunterOnly.some((s) => s.id === 'talkie_box' && s.jobId === 'archer'),
  'Talkie Box is Hunter-only',
)
assert.equal(SKILLS.talkie_box?.jobId, 'hunter')
assert.equal(SKILLS.ankle_snare?.jobId, 'hunter', 'traps belong to Hunter job tab')

console.log('skillTreeLayout.test.ts: ok')
