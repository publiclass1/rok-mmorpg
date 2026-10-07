import assert from 'node:assert'
import { createInitialCharacterState } from '../character/characterState'
import { isOnPecoMount } from './mountState'
import type { PlayerStatusBuff } from '../character/statusEffects'

const session = createInitialCharacterState()
const now = Date.now()

assert.equal(isOnPecoMount(session, [], now), false)

const withBuff: PlayerStatusBuff[] = [
  {
    statusId: 'peco_ride',
    name: 'Peco Peco Ride',
    iconSkillId: 'peco_peco_ride',
    skillLevel: 1,
    startedAt: now,
    expiresAt: now + 60_000,
  },
]
assert.equal(isOnPecoMount(session, withBuff, now), true)

const withRental = {
  ...session,
  activeRental: { kind: 'peco_peco' as const, expiresAt: now + 60_000 },
}
assert.equal(isOnPecoMount(withRental, [], now), true)

console.log('mountState.test.ts: ok')
