import assert from 'node:assert'
import { checkCanEquipItem, formatEquipRequirements } from './equipRequirements'

function run() {
  const swordFail = checkCanEquipItem({ baseLevel: 1, jobId: 'novice' }, 'sword')
  assert.equal(swordFail.ok, false)

  const swordJobFail = checkCanEquipItem({ baseLevel: 10, jobId: 'novice' }, 'sword')
  assert.equal(swordJobFail.ok, false)
  if (!swordJobFail.ok) {
    assert.ok(swordJobFail.reason.includes('Swordman'), swordJobFail.reason)
  }

  const swordOk = checkCanEquipItem({ baseLevel: 2, jobId: 'swordman' }, 'sword')
  assert.equal(swordOk.ok, true)

  const levelFail = checkCanEquipItem({ baseLevel: 3, jobId: 'archer' }, 'composite_bow')
  assert.equal(levelFail.ok, false)
  if (!levelFail.ok) {
    assert.ok(levelFail.reason.includes('Base Lv'), levelFail.reason)
  }

  const knifeOk = checkCanEquipItem({ baseLevel: 1, jobId: 'novice' }, 'knife')
  assert.equal(knifeOk.ok, true)

  const hint = formatEquipRequirements('sword')
  assert.ok(hint?.includes('Swordman'), hint ?? '')

  console.log('equipRequirements.test.ts: ok')
}

run()
