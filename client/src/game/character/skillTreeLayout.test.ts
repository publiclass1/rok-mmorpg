import assert from 'node:assert/strict'
import { SKILLS, skillsForJob } from './skillsConfig'
import { computeSkillTreeLayout, hasIntraJobPrereqEdges } from './skillTreeLayout'

const swordman = skillsForJob('swordman')
assert.equal(hasIntraJobPrereqEdges(swordman), true, 'swordman has magnum → bash')

const swordLayout = computeSkillTreeLayout(swordman)
assert.equal(swordLayout.mode, 'tree')
const magnumPos = swordLayout.positions.magnum
const bashPos = swordLayout.positions.bash
assert.ok(magnumPos && bashPos, 'magnum and bash positioned')
assert.ok(magnumPos.row > bashPos.row, 'magnum below bash')

const knight = skillsForJob('knight')
const knightLayout = computeSkillTreeLayout(knight)
assert.equal(knightLayout.mode, 'tree')
const spearMastery = knightLayout.positions.spear_mastery
const brandish = knightLayout.positions.brandish_spear
assert.ok(spearMastery && brandish, 'spear branch nodes')
assert.ok(brandish.row > spearMastery.row, 'brandish below spear mastery')

const acolyte = skillsForJob('acolyte')
assert.equal(hasIntraJobPrereqEdges(acolyte), false, 'acolyte has no intra-job edges')
const acolyteLayout = computeSkillTreeLayout(acolyte)
assert.equal(acolyteLayout.mode, 'grid')

assert.ok(SKILLS.heal, 'fixture skill heal exists')

console.log('skillTreeLayout.test.ts: ok')
