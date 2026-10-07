import assert from 'node:assert/strict'
import { autoAttackRotationHasSit, defaultAutoAttackConfig } from './autoAttackConfig'

const base = defaultAutoAttackConfig()
assert.equal(autoAttackRotationHasSit(base), false)

const withSit = { ...base, rotation: [...base.rotation] }
withSit.rotation[1] = 'sit'
assert.equal(autoAttackRotationHasSit(withSit), true)

console.log('autoAttackConfig.test.ts ok')
