import assert from 'node:assert'
import { buildItemTooltipDetail } from './itemTooltipDetail'

function allRows(detail: ReturnType<typeof buildItemTooltipDetail>) {
  return detail.sections.flatMap((s) => s.rows)
}

function run() {
  const potion = buildItemTooltipDetail('red_potion')
  assert.equal(potion.name, 'Red Potion')
  assert.ok(potion.subtitleLines.length === 0 || potion.sections.length > 0)
  assert.ok(allRows(potion).some((r) => r.label === 'Restores HP'))

  const blue = buildItemTooltipDetail('blue_potion')
  assert.equal(blue.name, 'Blue Potion')
  assert.ok(allRows(blue).some((r) => r.label === 'Restores SP'))

  const knife = buildItemTooltipDetail('knife')
  assert.ok(allRows(knife).some((r) => r.label === 'ATK'))
  assert.ok(allRows(knife).some((r) => r.label === 'Slot' && r.value === 'Weapon'))

  const stack = buildItemTooltipDetail('jellopy', { quantity: 5 })
  assert.ok(stack.name.includes('×5'))

  console.log('itemTooltipDetail.test.ts: ok')
}

run()
