import assert from 'node:assert'
import { calcDuelStrike } from '../../../../supabase/functions/_shared/duelCombat'
import type { DuelSnapshot } from '../../../../supabase/functions/_shared/duelCombat'

function duelSnapshot(overrides: Partial<DuelSnapshot>): DuelSnapshot {
  return {
    baseLevel: 1,
    jobId: 'novice',
    str: 1,
    agi: 1,
    vit: 1,
    int: 1,
    dex: 1,
    luk: 1,
    equipment: {},
    ...overrides,
  }
}

function rngFixed(value: number): () => number {
  return () => value
}

{
  // Non-crit miss via extreme FLEE.
  // attacker critChance will be 0 (attacker.luk is tiny); hit is based on flee.
  const attacker = duelSnapshot({ luk: 1, dex: 1 })
  const defender = duelSnapshot({ agi: 9999, luk: 1 })
  const res = calcDuelStrike(attacker, defender, rngFixed(0.999))
  assert.equal(res.hit, false)
  assert.equal(res.critical, false)
  assert.equal(res.damage, 0)
}

{
  // High VIT (DEF) should reduce non-crit damage.
  const attacker = duelSnapshot({ luk: 1, dex: 1 })
  const defenderLow = duelSnapshot({ agi: 0, luk: 0, vit: 1 })
  const defenderHigh = duelSnapshot({ agi: 0, luk: 0, vit: 100 })
  const resLow = calcDuelStrike(attacker, defenderLow, rngFixed(0))
  const resHigh = calcDuelStrike(attacker, defenderHigh, rngFixed(0))

  assert.equal(resLow.hit, true)
  assert.equal(resLow.critical, false)
  assert.equal(resHigh.hit, true)
  assert.equal(resHigh.critical, false)
  assert.ok(resHigh.damage < resLow.damage, 'higher defender VIT should reduce damage')
}

{
  // Defender LUK should reduce crit chance (crit resistance).
  const attacker = duelSnapshot({ luk: 90 })
  const defenderLowCrit = duelSnapshot({ luk: 0 })
  const defenderHighCritResist = duelSnapshot({ luk: 200 })

  const critLow = calcDuelStrike(attacker, defenderLowCrit, rngFixed(0))
  assert.equal(critLow.hit, true)
  assert.equal(critLow.critical, true)
  assert.ok(critLow.damage > 0)

  const critReduced = calcDuelStrike(attacker, defenderHighCritResist, rngFixed(0))
  assert.equal(critReduced.hit, true, 'should still be able to hit non-crit')
  assert.equal(critReduced.critical, false, 'high defender LUK should prevent critical')
}

{
  // Crit damage multiplier should scale with attacker LUK.
  const defender = duelSnapshot({ luk: 0, vit: 10, agi: 0 })
  const lowLukAttacker = duelSnapshot({ luk: 30 })
  const highLukAttacker = duelSnapshot({ luk: 90 })

  const low = calcDuelStrike(lowLukAttacker, defender, rngFixed(0))
  const high = calcDuelStrike(highLukAttacker, defender, rngFixed(0))

  assert.equal(low.critical, true)
  assert.equal(high.critical, true)
  assert.ok(high.damage > low.damage, 'higher attacker LUK should increase critical damage')
}

console.log('duelCombat.test.ts: ok')

