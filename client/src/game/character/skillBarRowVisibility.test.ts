import assert from 'node:assert'
import {
  defaultSkillBarRowsVisible,
  revealNextSkillBarRow,
  skillBarRevealMenuLabel,
  visibleSkillBarRowCount,
} from './skillBarRowVisibility'

function run() {
  const defaultVisible = defaultSkillBarRowsVisible()
  assert.deepEqual(defaultVisible, [true, false, false, false])
  assert.equal(visibleSkillBarRowCount(defaultVisible), 1)

  let visible = [...defaultVisible]
  visible = revealNextSkillBarRow(visible)
  assert.deepEqual(visible, [true, true, false, false])
  assert.equal(skillBarRevealMenuLabel(visible), 'Show bar A–L')

  visible = revealNextSkillBarRow(visible)
  visible = revealNextSkillBarRow(visible)
  assert.deepEqual(visible, [true, true, true, true])
  assert.equal(visibleSkillBarRowCount(visible), 4)
  assert.equal(skillBarRevealMenuLabel(visible), null)

  visible = revealNextSkillBarRow(visible)
  assert.deepEqual(visible, [true, true, true, true])

  console.log('skillBarRowVisibility.test.ts: ok')
}

run()
