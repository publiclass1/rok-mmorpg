import assert from 'node:assert'
import { buildItemTooltipDetail } from './itemTooltipDetail'

function run() {
  const potion = buildItemTooltipDetail('red_potion')
  assert.equal(potion.name, 'Red Potion')
  assert.ok(potion.subtitleLines.some((l) => l.toLowerCase().includes('consumable')))
  assert.ok(potion.effectLines.some((l) => l.includes('HP')))

  const knife = buildItemTooltipDetail('knife')
  assert.ok(knife.statLines.some((l) => l.startsWith('ATK')))
  assert.ok(knife.subtitleLines.some((l) => l.includes('Lv')))

  const stack = buildItemTooltipDetail('jellopy', { quantity: 5 })
  assert.ok(stack.name.includes('×5'))

  console.log('itemTooltipDetail.test.ts: ok')
}

run()
