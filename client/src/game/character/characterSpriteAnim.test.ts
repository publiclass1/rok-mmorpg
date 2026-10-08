import assert from 'node:assert'
import { defaultCharacterPose } from './characterPose'
import { poseToFrameIndex } from './characterSpriteAnim'
import { DEFAULT_CHARACTER_APPEARANCE } from './characterAppearance'
import { resolvePlayerSpriteDef } from './characterSpriteRegistry'

const def = resolvePlayerSpriteDef(DEFAULT_CHARACTER_APPEARANCE, 'novice')

const groundSitFrame = poseToFrameIndex(def, { ...defaultCharacterPose('down'), anim: 'sit' })

const walkFrame0 = poseToFrameIndex(def, {
  ...defaultCharacterPose('down'),
  anim: 'walk',
  walkFrame: 0,
  mounted: false,
})

const walkFrame1 = poseToFrameIndex(def, {
  ...defaultCharacterPose('down'),
  anim: 'walk',
  walkFrame: 1,
  mounted: false,
})

assert.notEqual(walkFrame0, walkFrame1, 'unmounted walk should alternate leg frames')

const mountedWalk1 = poseToFrameIndex(def, {
  ...defaultCharacterPose('down'),
  anim: 'walk',
  walkFrame: 1,
  mounted: true,
})

const mountedIdle = poseToFrameIndex(def, {
  ...defaultCharacterPose('down'),
  anim: 'idle',
  mounted: true,
})

assert.notEqual(mountedIdle, groundSitFrame, 'mounted idle should use saddle sit frame')
assert.equal(mountedIdle, mountedWalk1, 'mounted walk should use same saddle sit frame')

console.log('characterSpriteAnim.test.ts: ok')
