import assert from 'node:assert/strict'
import {
  autoAttackAssignableSkills,
  canPlaceOnAutoAttackRotation,
  isEnemyTargetAoESkill,
  isGroundAoEDamageSkill,
} from './skillsConfig'

const knightSheet = {
  jobId: 'knight',
  skills: {
    basic_attack: 1,
    bash: 5,
    brandish_spear: 3,
    sit: 1,
  },
}

const wizardSheet = {
  jobId: 'wizard',
  skills: {
    fire_ball: 5,
    meteor_storm: 3,
    safety_wall: 5,
  },
}

const archerSheet = {
  jobId: 'archer',
  skills: {
    arrow_shower: 5,
    double_strafe: 5,
  },
}

const hunterSheet = {
  jobId: 'hunter',
  skills: {
    ankle_snare: 3,
    steel_crow: 5,
    blitz_beat: 3,
  },
}

assert.equal(
  canPlaceOnAutoAttackRotation('brandish_spear', knightSheet),
  true,
  'knight job skill',
)
assert.ok(isEnemyTargetAoESkill('brandish_spear'))
assert.ok(isGroundAoEDamageSkill('fire_ball'))
assert.equal(canPlaceOnAutoAttackRotation('fire_ball', wizardSheet), true, 'ground AoE allowed')
assert.equal(canPlaceOnAutoAttackRotation('safety_wall', wizardSheet), false, 'ground stub blocked')
assert.equal(canPlaceOnAutoAttackRotation('ankle_snare', hunterSheet), false, 'trap ground blocked')
assert.equal(
  canPlaceOnAutoAttackRotation('steel_crow', hunterSheet),
  false,
  'passive steel_crow not rotatable',
)
assert.equal(
  canPlaceOnAutoAttackRotation('blitz_beat', hunterSheet),
  true,
  'blitz_beat active rotatable',
)
assert.equal(canPlaceOnAutoAttackRotation('arrow_shower', archerSheet), true, 'physical ground AoE')
assert.equal(canPlaceOnAutoAttackRotation('sit', knightSheet), true, 'sit allowed in rotation')
assert.equal(canPlaceOnAutoAttackRotation('play_dead', knightSheet), false, 'play_dead excluded')
assert.equal(
  canPlaceOnAutoAttackRotation('brandish_spear', { jobId: 'knight', skills: { brandish_spear: 0 } }),
  false,
  'unlearned',
)

const swordmanKnightLine = {
  jobId: 'knight',
  skills: { bash: 5, brandish_spear: 1 },
}
assert.equal(
  canPlaceOnAutoAttackRotation('bash', swordmanKnightLine),
  true,
  'swordman bash usable on knight',
)

const assignable = autoAttackAssignableSkills(knightSheet)
assert.ok(assignable.some((s) => s.id === 'brandish_spear'))
assert.ok(!assignable.some((s) => s.id === 'safety_wall'))
assert.ok(assignable.some((s) => s.id === 'sit'))

const wizardAssignable = autoAttackAssignableSkills(wizardSheet)
assert.ok(wizardAssignable.some((s) => s.id === 'fire_ball'))
assert.ok(!wizardAssignable.some((s) => s.id === 'safety_wall'))

console.log('skillsConfig.autoAttack.test.ts ok')
