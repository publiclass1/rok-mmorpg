import assert from 'node:assert'
import {
  idleAnimProfile,
  idleRigTween,
  idleSpritePose,
  listPlayerIdleConfigKeys,
} from './playerIdleMotion'

const EXPECTED_AVATAR_KEYS = [
  'novice',
  'swordman',
  'knight',
  'mage',
  'archer',
  'hunter',
  'acolyte',
  'merchant',
  'thief',
] as const

assert.deepEqual(listPlayerIdleConfigKeys(), [...EXPECTED_AVATAR_KEYS])

for (const key of EXPECTED_AVATAR_KEYS) {
  const pose0 = idleSpritePose(key, 0)
  const pose1 = idleSpritePose(key, 1)
  assert.ok(typeof pose0.bob === 'number' && typeof pose0.armSwing === 'number')
  assert.ok(typeof pose1.legSpread === 'number')

  const anim = idleAnimProfile(key)
  assert.ok(anim.frames.length >= 3, `${key} idle anim should have hold/blink pattern`)
  assert.ok(anim.frames.every((f) => f === 0 || f === 1))

  const rig = idleRigTween(key)
  assert.ok(rig.durationMs >= 1000)
}

console.log('playerIdleMotion.test.ts: ok')
