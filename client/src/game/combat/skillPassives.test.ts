import assert from 'node:assert'
import {
  canSteelCrowAutoBlitzProc,
  shouldQueueSteelCrowProcAfterBasicCrit,
  steelCrowBlitzDamageMultiplier,
  steelCrowProcSkipReason,
} from './skillPassives'

function run() {
  assert.equal(steelCrowBlitzDamageMultiplier({}), 1)
  assert.equal(steelCrowBlitzDamageMultiplier({ steel_crow: 10 }), 1.6)
  assert.ok(
    steelCrowBlitzDamageMultiplier({ steel_crow: 10 }) >
      steelCrowBlitzDamageMultiplier({ steel_crow: 1 }),
  )

  const base = {
    critical: true,
    weaponClass: 'bow' as const,
    skills: { steel_crow: 1, blitz_beat: 1 },
    hasFalconRental: true,
    attackKind: 'basic_attack' as const,
  }
  assert.equal(canSteelCrowAutoBlitzProc(base), true)
  assert.equal(canSteelCrowAutoBlitzProc({ ...base, critical: false }), false)
  assert.equal(canSteelCrowAutoBlitzProc({ ...base, weaponClass: 'sword' }), false)
  assert.equal(canSteelCrowAutoBlitzProc({ ...base, skills: { steel_crow: 0, blitz_beat: 1 } }), false)
  assert.equal(canSteelCrowAutoBlitzProc({ ...base, hasFalconRental: false }), false)
  assert.equal(steelCrowProcSkipReason(base), null)
  assert.ok(steelCrowProcSkipReason({ ...base, hasFalconRental: false })?.includes('falcon'))

  assert.equal(
    shouldQueueSteelCrowProcAfterBasicCrit({
      hit: true,
      damage: 50,
      critical: true,
      weaponClass: 'bow',
      skills: { steel_crow: 1, blitz_beat: 1 },
      hasFalconRental: true,
    }),
    true,
  )
  assert.equal(
    shouldQueueSteelCrowProcAfterBasicCrit({
      hit: true,
      damage: 50,
      critical: false,
      weaponClass: 'bow',
      skills: { steel_crow: 1, blitz_beat: 1 },
      hasFalconRental: true,
    }),
    false,
  )

  console.log('skillPassives.test.ts: ok')
}

run()
