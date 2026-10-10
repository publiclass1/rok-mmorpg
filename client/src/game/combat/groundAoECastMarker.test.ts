import assert from 'node:assert'
import { SKILLS } from '../character/skillsConfig'
import {
  GROUND_AOE_IMPACT_DURATION_MS,
  groundAoEDamageTickCount,
  groundAoEElementStyle,
  groundAoERadiusPx,
  usesGroundAoECastMarker,
} from './groundAoECastMarker'

function run() {
  const meteor = SKILLS.meteor_storm
  assert.ok(meteor)
  assert.equal(groundAoERadiusPx(meteor, 'meteor_storm'), 80)

  const quag = SKILLS.quagmire
  assert.ok(quag)
  assert.equal(groundAoERadiusPx(quag, 'quagmire'), 48)

  const showerStyle = groundAoEElementStyle('arrow_shower')
  assert.equal(showerStyle.fill, 0x4d7c0f)
  assert.notEqual(showerStyle.fill, 0xa78bfa)

  const fireStyle = groundAoEElementStyle('meteor_storm')
  assert.equal(fireStyle.fill, 0xef4444)
  const waterStyle = groundAoEElementStyle('storm_gust')
  assert.equal(waterStyle.stroke, 0x38bdf8)
  const lov = SKILLS.lord_of_vermilion
  assert.ok(lov?.magic?.element === 'wind')
  const windStyle = groundAoEElementStyle('lord_of_vermilion')
  assert.equal(windStyle.stroke, 0xfde047)
  assert.notEqual(windStyle.fill, fireStyle.fill)

  assert.equal(usesGroundAoECastMarker('meteor_storm'), true)
  assert.equal(usesGroundAoECastMarker('fire_ball'), true)
  assert.equal(usesGroundAoECastMarker('arrow_shower'), true)
  assert.equal(usesGroundAoECastMarker('fire_bolt'), false)
  assert.equal(GROUND_AOE_IMPACT_DURATION_MS, 3000)
  assert.equal(groundAoEDamageTickCount(), 10)

  console.log('groundAoECastMarker.test.ts: ok')
}

run()
