import assert from 'node:assert/strict'
import { shouldStandFromAutoSit } from './autoAttackSitRegen'

assert.equal(shouldStandFromAutoSit(50, 100), false)
assert.equal(shouldStandFromAutoSit(99, 100), false)
assert.equal(shouldStandFromAutoSit(100, 100), true)
assert.equal(shouldStandFromAutoSit(0, 0), true)

console.log('autoAttackSitRegen.test.ts ok')
