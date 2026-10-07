import assert from 'node:assert'
import { defaultCharacterPose } from './characterPose'
import { poseToFrameIndex } from './characterSpriteAnim'
import { DEFAULT_CHARACTER_APPEARANCE } from './characterAppearance'
import { resolvePlayerSpriteDef } from './characterSpriteRegistry'

const def = resolvePlayerSpriteDef(DEFAULT_CHARACTER_APPEARANCE, 'novice')

const sitFrame = poseToFrameIndex(def, { ...defaultCharacterPose('down'), anim: 'sit' })

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

assert.equal(mountedIdle, sitFrame, 'mounted idle should use sit frame')
assert.equal(mountedWalk1, sitFrame, 'mounted walk should use sit frame (no leg cycle)')

console.log('characterSpriteAnim.test.ts: ok')
