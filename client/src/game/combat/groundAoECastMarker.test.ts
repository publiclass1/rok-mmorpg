import assert from 'node:assert'
import { SKILLS } from '../character/skillsConfig'
import {
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

  const fireStyle = groundAoEElementStyle('meteor_storm')
  assert.equal(fireStyle.fill, 0xef4444)
  const waterStyle = groundAoEElementStyle('storm_gust')
  assert.equal(waterStyle.stroke, 0x38bdf8)

  assert.equal(usesGroundAoECastMarker('meteor_storm'), true)
  assert.equal(usesGroundAoECastMarker('fire_bolt'), false)

  console.log('groundAoECastMarker.test.ts: ok')
}

run()
