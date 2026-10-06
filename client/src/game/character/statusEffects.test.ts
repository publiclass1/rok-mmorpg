import assert from 'node:assert'
import {
  applySelfBuff,
  buffDurationMs,
  buffsEqual,
  hasStatus,
  pruneExpired,
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

  console.log('statusEffects.test.ts: ok')
}

run()
