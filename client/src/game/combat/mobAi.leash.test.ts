import assert from 'node:assert/strict'
import { mobBrokeSpotLeash } from './mobAi'
import type { MobDefinition } from './mobConfig'
import type { MobInstance } from './mobTypes'

const def: MobDefinition = {
  id: 'poring',
  name: 'Poring',
  level: 1,
  maxHp: 50,
  atk: 4,
  def: 0,
  mdef: 0,
  element: 'water',
  size: 'medium',
  hit: 10,
  flee: 5,
  color: 0xffffff,
  aggroRange: 140,
  attackRange: 36,
  attackCooldownMs: 1200,
  roamRadius: 96,
  moveSpeed: 55,
  wanderPauseMs: 2000,
  wikiBaseExp: 1,
  wikiJobExp: 1,
  drops: [],
  skills: [],
  isBoss: false,
}

function mobAt(x: number, y: number, spot: Partial<MobInstance>): MobInstance {
  return {
    spawnIndex: 0,
    sprite: { x, y } as MobInstance['sprite'],
    hpBarBg: {} as MobInstance['hpBarBg'],
    hpBarFill: {} as MobInstance['hpBarFill'],
    label: {} as MobInstance['label'],
    defId: 'poring',
    hp: 50,
    maxHp: 50,
    level: 1,
    name: 'Poring',
    spawnX: 120,
    spawnY: 120,
    alive: true,
    state: 'wander',
    roamTargetX: 120,
    roamTargetY: 120,
    lastAttackAt: 0,
    lastWanderAt: 0,
    provokedByPlayer: false,
    skillCooldownUntil: {},
    respawnMs: 8000,
    canLure: true,
    lureRadius: 200,
    spotCenterX: 132,
    spotCenterY: 132,
    spotRect: { x: 100, y: 100, width: 64, height: 64 },
    ...spot,
  }
}

const inside = mobAt(120, 120, { canLure: false })
assert.equal(mobBrokeSpotLeash(inside, def), false)

const outsideNoLure = mobAt(200, 200, { canLure: false })
assert.equal(mobBrokeSpotLeash(outsideNoLure, def), true)

const luredOk = mobAt(180, 132, { canLure: true, lureRadius: 200 })
assert.equal(mobBrokeSpotLeash(luredOk, def), false)

const luredTooFar = mobAt(400, 132, { canLure: true, lureRadius: 200 })
assert.equal(mobBrokeSpotLeash(luredTooFar, def), true)

console.log('mobAi.leash.test.ts OK')
