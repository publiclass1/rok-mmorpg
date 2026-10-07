import assert from 'node:assert/strict'
import {
  isInsidePatrolAnchor,
  mobPassesFilter,
  pickAutoAttackTarget,
  pickPatrolChaseTarget,
} from './autoAttackTargeting'

const mobs = [
  { defId: 'poring', spawnIndex: 0, alive: true, x: 100, y: 100 },
  { defId: 'lunatic', spawnIndex: 1, alive: true, x: 120, y: 100 },
  { defId: 'poring', spawnIndex: 2, alive: false, x: 105, y: 105 },
]

assert.equal(mobPassesFilter('poring', { all: true }), true)
assert.equal(mobPassesFilter('lunatic', { all: false, defIds: ['poring'] }), false)

assert.equal(isInsidePatrolAnchor(110, 100, 100, 100, 15), true)
assert.equal(isInsidePatrolAnchor(200, 100, 100, 100, 15), false)

const inRange = pickAutoAttackTarget({
  playerX: 100,
  playerY: 100,
  anchorX: 100,
  anchorY: 100,
  mobs,
  filter: { all: true },
  movementMode: 'stay_still',
  patrolRadiusPx: 200,
  attackRangePx: 50,
})
assert.ok(inRange)
assert.equal(inRange!.defId, 'poring')

const stayStillFar = pickAutoAttackTarget({
  playerX: 100,
  playerY: 100,
  anchorX: 100,
  anchorY: 100,
  mobs: [{ defId: 'poring', spawnIndex: 0, alive: true, x: 300, y: 100 }],
  filter: { all: true },
  movementMode: 'stay_still',
  patrolRadiusPx: 500,
  attackRangePx: 50,
})
assert.equal(stayStillFar, null)

const filtered = pickAutoAttackTarget({
  playerX: 100,
  playerY: 100,
  anchorX: 100,
  anchorY: 100,
  mobs,
  filter: { all: false, defIds: ['lunatic'] },
  movementMode: 'patrol_range',
  patrolRadiusPx: 200,
  attackRangePx: 500,
})
assert.ok(filtered)
assert.equal(filtered!.defId, 'lunatic')

const outsidePatrol = pickAutoAttackTarget({
  playerX: 100,
  playerY: 100,
  anchorX: 100,
  anchorY: 100,
  mobs: [{ defId: 'poring', spawnIndex: 0, alive: true, x: 400, y: 100 }],
  filter: { all: true },
  movementMode: 'patrol_range',
  patrolRadiusPx: 50,
  attackRangePx: 500,
})
assert.equal(outsidePatrol, null)

const chase = pickPatrolChaseTarget({
  playerX: 100,
  playerY: 100,
  anchorX: 100,
  anchorY: 100,
  mobs: [{ defId: 'poring', spawnIndex: 0, alive: true, x: 150, y: 100 }],
  filter: { all: true },
  patrolRadiusPx: 80,
})
assert.ok(chase)

console.log('autoAttackTargeting.test.ts ok')
