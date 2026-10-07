import assert from 'node:assert'
import {
  calcPreRenewalCastTimeMs,
  DEX_FOR_ZERO_CAST,
  skillCastStrikeDelayMs,
  SKILL_STRIKE_WINDUP_MS,
} from './castTime'
import { createInitialCharacterState } from '../character/characterState'

function run() {
  assert.equal(calcPreRenewalCastTimeMs(0, 50), 0)
  assert.equal(calcPreRenewalCastTimeMs(1000, 0), 1000)
  assert.equal(calcPreRenewalCastTimeMs(1000, 65), 500)
  assert.equal(calcPreRenewalCastTimeMs(1000, DEX_FOR_ZERO_CAST), 0)
  assert.equal(calcPreRenewalCastTimeMs(1000, 200), 0)

  assert.equal(calcPreRenewalCastTimeMs(1000, 0, { suffragiumLevel: 1 }), 850)
  assert.equal(calcPreRenewalCastTimeMs(1000, 0, { castTimeReducePercent: 10 }), 900)

  const session = { ...createInitialCharacterState(), dex: 99 }
  assert.equal(
    skillCastStrikeDelayMs(800, session),
    Math.max(SKILL_STRIKE_WINDUP_MS, Math.floor(800 * (1 - 99 / DEX_FOR_ZERO_CAST))),
  )

  const instant = { ...createInitialCharacterState(), dex: DEX_FOR_ZERO_CAST }
  assert.equal(skillCastStrikeDelayMs(800, instant), SKILL_STRIKE_WINDUP_MS)

  console.log('castTime.test.ts: ok')
}

run()
