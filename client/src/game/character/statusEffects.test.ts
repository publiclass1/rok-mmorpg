import assert from 'node:assert'
import {
  applySelfBuff,
  buffDurationMs,
  buffsEqual,
  hasStatus,
  PECO_RIDE_STATUS_ID,
  pruneExpired,
  removeStatus,
  toPlayerBuffPayloads,
} from './statusEffects'

function run() {
  let buffs = applySelfBuff([], {
    statusId: 'endure',
    name: 'Endure',
    iconSkillId: 'endure',
    skillLevel: 5,
    now: 1000,
    durationMs: 25000,
  })
  assert.equal(buffs.length, 1)
  assert.equal(buffs[0].expiresAt, 26000)
  assert.equal(buffDurationMs(buffs[0]), 25000)
  assert.ok(hasStatus(buffs, 'endure'))

  buffs = applySelfBuff(buffs, {
    statusId: 'endure',
    name: 'Endure',
    iconSkillId: 'endure',
    skillLevel: 5,
    now: 5000,
    durationMs: 13000,
  })
  assert.equal(buffs.length, 1)
  assert.equal(buffs[0].startedAt, 5000)
  assert.equal(buffs[0].expiresAt, 18000)

  buffs = applySelfBuff(buffs, {
    statusId: 'magnum_break',
    name: 'Magnum Break',
    iconSkillId: 'magnum',
    skillLevel: 1,
    now: 5000,
    durationMs: 10000,
  })
  assert.equal(buffs.length, 2)

  const pruned = pruneExpired(buffs, 16000)
  assert.equal(pruned.length, 1)
  assert.equal(pruned[0].statusId, 'endure')
  assert.ok(!hasStatus(pruned, 'magnum_break'))

  assert.ok(buffsEqual(buffs, [...buffs]))
  assert.ok(!buffsEqual(buffs, pruned))

  const mounted = applySelfBuff([], {
    statusId: PECO_RIDE_STATUS_ID,
    name: 'Peco Peco Ride',
    iconSkillId: 'peco_peco_ride',
    skillLevel: 1,
    now: 1000,
    expiresAt: Number.POSITIVE_INFINITY,
  })
  assert.equal(pruneExpired(mounted, 9_999_999_999).length, 1)

  const payloads = toPlayerBuffPayloads(mounted)
  assert.equal(payloads[0].displayKind, 'status')

  const endurePayloads = toPlayerBuffPayloads(pruned)
  assert.equal(endurePayloads[0].displayKind, 'buff')

  const afterDismount = removeStatus(mounted, PECO_RIDE_STATUS_ID)
  assert.equal(afterDismount.length, 0)

  console.log('statusEffects.test.ts: ok')
}

run()
