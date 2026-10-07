import assert from 'node:assert/strict'
import {
  pvpPassiveRegenAmounts,
  pvpPassiveRegenIntervalMs,
  sitRegenAmounts,
  sitRegenIntervalMs,
  SIT_REGEN_INTERVAL_MS,
} from './sitRegen'

assert.equal(sitRegenIntervalMs(), SIT_REGEN_INTERVAL_MS)
assert.equal(SIT_REGEN_INTERVAL_MS, 1000)

assert.deepEqual(sitRegenAmounts(100, 100), { hp: 5, mp: 5 })
assert.deepEqual(sitRegenAmounts(10, 10), { hp: 1, mp: 1 })

assert.equal(pvpPassiveRegenIntervalMs(), 10_000)
assert.deepEqual(pvpPassiveRegenAmounts(100, 200), { hp: 10, mp: 20 })

console.log('sitRegen.test.ts ok')
