import assert from 'node:assert/strict'
import { pickNearestMobInView } from './nearestMobInView'

const view = { left: 0, right: 800, top: 0, bottom: 600 }

assert.equal(
  pickNearestMobInView({
    playerX: 100,
    playerY: 100,
    view,
    candidates: [],
  }),
  null,
)

assert.equal(
  pickNearestMobInView({
    playerX: 100,
    playerY: 100,
    view,
    candidates: [
      { mob: 'off', alive: true, x: 900, y: 100 },
      { mob: 'dead', alive: false, x: 200, y: 100 },
    ],
  }),
  null,
)

const nearer = { id: 'near' }
const farther = { id: 'far' }
const picked = pickNearestMobInView({
  playerX: 400,
  playerY: 300,
  view,
  candidates: [
    { mob: farther, alive: true, x: 500, y: 300 },
    { mob: nearer, alive: true, x: 420, y: 300 },
  ],
})
assert.equal(picked, nearer)

console.log('nearestMobInView.test.ts ok')
