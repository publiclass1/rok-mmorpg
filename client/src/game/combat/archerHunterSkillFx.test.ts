import assert from 'node:assert/strict'
import {
  ARCHER_SHOWER_STYLE,
  archerGroundStyle,
  BLITZ_AOE_VISUAL_RADIUS_PX,
} from './archerHunterSkillFx'
import { magicProjectileKindForSkill } from './rangedProjectileFx'

assert.equal(archerGroundStyle('arrow_shower'), ARCHER_SHOWER_STYLE)
assert.equal(archerGroundStyle('double_strafe'), null)
assert.equal(ARCHER_SHOWER_STYLE.fill, 0x4d7c0f)
assert.equal(BLITZ_AOE_VISUAL_RADIUS_PX, 72)
assert.equal(magicProjectileKindForSkill('blitz_beat'), 'falcon')

console.log('archerHunterSkillFx.test.ts: ok')
