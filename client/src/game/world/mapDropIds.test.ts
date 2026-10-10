import assert from 'node:assert/strict'
import { isEphemeralMapDropId } from './mapDropIds'

assert.equal(isEphemeralMapDropId('mvpdrop_char_123_0'), true)
assert.equal(isEphemeralMapDropId('550e8400-e29b-41d4-a716-446655440000'), false)
assert.equal(isEphemeralMapDropId('mobdrop_user_1_2_0'), false)

console.log('mapDropIds.test.ts ok')
