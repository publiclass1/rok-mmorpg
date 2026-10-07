import assert from 'node:assert/strict'
import {
  autoAttackAssignableSkills,
  canPlaceOnAutoAttackRotation,
} from './skillsConfig'

const knightSheet = {
  jobId: 'knight',
  skills: {
    basic_attack: 1,
    bash: 5,
    brandish_spear: 3,
    fire_wall: 1,
    sit: 1,
  },
}

assert.equal(
  canPlaceOnAutoAttackRotation('brandish_spear', knightSheet),
  true,
  'knight job skill',
)
assert.equal(canPlaceOnAutoAttackRotation('fire_wall', knightSheet), false, 'ground skill')
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
assert.ok(!assignable.some((s) => s.id === 'fire_wall'))
assert.ok(assignable.some((s) => s.id === 'sit'))

console.log('skillsConfig.autoAttack.test.ts ok')
