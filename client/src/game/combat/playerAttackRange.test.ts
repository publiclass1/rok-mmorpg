import assert from 'node:assert'
import { createDefaultEquipment } from '../character/characterState'
import {
  ATTACK_RANGE_CELLS_BY_CLASS,
  findMobInAttackCone,
  getEquippedWeaponClass,
  getPlayerAttackRangePx,
  MAP_TILE_SIZE,
  resolvePlayerAttackTarget,
  usesTargetedAttack,
} from './playerAttackRange'

type MockMob = { alive: boolean; x: number; y: number; id: string }

function run() {
  const emptyEquip = createDefaultEquipment()
  assert.equal(getEquippedWeaponClass(emptyEquip), 'unarmed')
  assert.equal(getPlayerAttackRangePx(emptyEquip), MAP_TILE_SIZE)

  const withKnife = { ...emptyEquip, weapon: 'knife' }
  assert.equal(getEquippedWeaponClass(withKnife), 'knife')
  assert.equal(getPlayerAttackRangePx(withKnife), ATTACK_RANGE_CELLS_BY_CLASS.knife * MAP_TILE_SIZE)

  assert.equal(usesTargetedAttack('bow'), true)
  assert.equal(usesTargetedAttack('sword'), false)

  const px = 0
  const py = 0
  const mobs: MockMob[] = [
    { id: 'a', alive: true, x: 30, y: 0 },
    { id: 'b', alive: true, x: 0, y: 40 },
  ]
  const inCone = findMobInAttackCone(px, py, 'right', 32, mobs)
  assert.equal(inCone?.id, 'a')
  const behind = findMobInAttackCone(px, py, 'left', 32, mobs)
  assert.equal(behind, null)

  const chase: MockMob = { id: 'c', alive: true, x: 100, y: 0 }
  const selected: MockMob = { id: 'd', alive: true, x: 200, y: 0 }
  const spearHit = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'left',
    rangePx: 160,
    weaponClass: 'spear',
    mobs,
    chaseMob: chase,
    selectedMob: selected,
  })
  assert.equal(spearHit?.id, 'c')

  const bowHit = resolvePlayerAttackTarget({
    playerX: px,
    playerY: py,
    facing: 'up',
    rangePx: 320,
    weaponClass: 'bow',
    mobs,
    chaseMob: null,
    selectedMob: selected,
  })
  assert.equal(bowHit?.id, 'd')

  console.log('playerAttackRange.test.ts: ok')
}

run()
