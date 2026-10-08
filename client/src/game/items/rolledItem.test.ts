import assert from 'node:assert'
import { dungeonFloors } from '../world/dungeonConfig'
import {
  isRolledItemId,
  parseRolledBaseItemId,
  rollDungeonGear,
  rollDungeonMvpGearDrops,
} from './rolledItem'

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

  const critItem = rollDungeonGear(floor, true, () => 0.999)
  assert.ok(critItem, 'mvp roll should produce gear (critChance case)')
  assert.equal(critItem!.effect.kind, 'critChance')

  const nonMvpItem = rollDungeonGear(floor, false, () => 0)
  assert.ok(nonMvpItem, 'non-mvp roll should produce gear')
  assert.notEqual(nonMvpItem!.effect.kind, 'critChance')

  const mvpDrops = rollDungeonMvpGearDrops(floor, () => 0.1)
  assert.equal(mvpDrops.length, floor.gearDrop.mvpRolls)
  for (const drop of mvpDrops) {
    assert.ok(isRolledItemId(drop.id))
  }

  console.log('rolledItem.test.ts: ok')
}

run()
