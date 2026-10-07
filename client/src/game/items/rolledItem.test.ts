import assert from 'node:assert'
import { dungeonFloors } from '../world/dungeonConfig'
import { isRolledItemId, parseRolledBaseItemId, rollDungeonGear } from './rolledItem'

function run() {
  const floor = dungeonFloors()[0]
  const item = rollDungeonGear(floor, true, () => 0.1)
  assert.ok(item, 'mvp roll should produce gear')
  assert.equal(item!.slots, 2)
  assert.deepEqual(item!.cards, [null, null])
  assert.equal(Object.keys(item!.stats).length, 3)
  assert.ok(item!.effect.percent >= 1 && item!.effect.percent <= 25)
  assert.ok(item!.requiredBaseLevel >= floor.minLevel)
  assert.ok(item!.requiredBaseLevel <= floor.maxLevel)
  assert.ok(isRolledItemId(item!.id))
  assert.ok(parseRolledBaseItemId(item!.id))
  console.log('rolledItem.test.ts: ok')
}

run()
