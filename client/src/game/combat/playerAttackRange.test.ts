import assert from 'node:assert'
import { createDefaultEquipment } from '../character/characterState'
import {
  ATTACK_RANGE_CELLS_BY_CLASS,
  findMobInAttackCone,
  getEquippedWeaponClass,
  getPlayerAttackRangePx,
  MAP_TILE_SIZE,
  resolveEnemySkillTarget,
  resolvePlayerAttackTarget,
  usesTargetedAttack,
} from './playerAttackRange'

type MockMob = { alive: boolean; x: number; y: number; id: string }

function run() {
  const emptyEquip = createDefaultEquipment()
  assert.equal(getEquippedWeaponClass(emptyEquip), 'unarmed')
  assert.equal(getPlayerAttackRangePx(emptyEquip), MAP_TILE_SIZE)
  assert.equal(ATTACK_RANGE_CELLS_BY_CLASS.spear, 2)

  const withKnife = { ...emptyEquip, weapon: 'knife' }
  assert.equal(getEquippedWeaponClass(withKnife), 'knife')
  assert.equal(getPlayerAttackRangePx(withKnife), ATTACK_RANGE_CELLS_BY_CLASS.knife * MAP_TILE_SIZE)

  assert.equal(usesTargetedAttack('bow'), true)
  assert.equal(usesTargetedAttack('staff'), true)
  assert.equal(usesTargetedAttack('spear'), false)
  assert.equal(usesTargetedAttack('sword'), false)

  const px = 0
  const py = 0
  const mobs: MockMob[] = [
    { id: 'a', alive: true, x: 30, y: 0 },
    { id: 'b', alive: true, x: 0, y: 40 },
  ]
  const inCone = findMobInAttackCone(px, py, 'right', 1, mobs)
  assert.equal(inCone?.id, 'a')
  const behind = findMobInAttackCone(px, py, 'left', 1, mobs)
  assert.equal(behind, null)

  const chaseInRange: MockMob = { id: 'c', alive: true, x: 2 * MAP_TILE_SIZE, y: 0 }
  const chaseOutOfRange: MockMob = { id: 'c_far', alive: true, x: 3 * MAP_TILE_SIZE, y: 0 }
  const spearHit = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'right',
    rangeCells: 2,
    weaponClass: 'spear',
    mobs,
    chaseMob: chaseInRange,
    selectedMob: null,
  })
  assert.equal(spearHit?.id, 'c')

  const spearMissRange = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'right',
    rangeCells: 2,
    weaponClass: 'spear',
    mobs: [],
    chaseMob: chaseOutOfRange,
    selectedMob: null,
  })
  assert.equal(spearMissRange, null)

  const spearMissCone = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'left',
    rangeCells: 2,
    weaponClass: 'spear',
    mobs,
    chaseMob: chaseInRange,
    selectedMob: null,
  })
  assert.equal(spearMissCone, null)

  const selected10: MockMob = { id: 'd', alive: true, x: 10 * MAP_TILE_SIZE, y: 0 }
  const selected11: MockMob = { id: 'd_far', alive: true, x: 11 * MAP_TILE_SIZE, y: 0 }
  const bowHit = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'up',
    rangeCells: 10,
    weaponClass: 'bow',
    mobs,
    chaseMob: null,
    selectedMob: selected10,
  })
  assert.equal(bowHit?.id, 'd')

  const bowMiss = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'up',
    rangeCells: 10,
    weaponClass: 'bow',
    mobs,
    chaseMob: null,
    selectedMob: selected11,
  })
  assert.equal(bowMiss, null)

  const skillRange240 = 240
  const farSelected: MockMob = { id: 'mage_far', alive: true, x: 5 * MAP_TILE_SIZE, y: 0 }
  const unarmedMelee = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'right',
    rangeCells: 1,
    weaponClass: 'unarmed',
    mobs: [farSelected],
    chaseMob: null,
    selectedMob: farSelected,
  })
  assert.equal(unarmedMelee, null)

  const skillHit = resolveEnemySkillTarget({
    playerX: px,
    playerY: py,
    skillRangePx: skillRange240,
    mobs: [farSelected],
    chaseMob: null,
    selectedMob: farSelected,
  })
  assert.equal(skillHit?.id, 'mage_far')

  const nearest: MockMob = { id: 'near', alive: true, x: 100, y: 0 }
  const farther: MockMob = { id: 'far', alive: true, x: 200, y: 0 }
  const nearestPick = resolveEnemySkillTarget({
    playerX: px,
    playerY: py,
    skillRangePx: skillRange240,
    mobs: [farther, nearest],
    chaseMob: null,
    selectedMob: null,
  })
  assert.equal(nearestPick?.id, 'near')

  const outOfSkill: MockMob = { id: 'too_far', alive: true, x: 300, y: 0 }
  const skillMiss = resolveEnemySkillTarget({
    playerX: px,
    playerY: py,
    skillRangePx: skillRange240,
    mobs: [outOfSkill],
    chaseMob: null,
    selectedMob: null,
  })
  assert.equal(skillMiss, null)

  console.log('playerAttackRange.test.ts: ok')
}

run()
