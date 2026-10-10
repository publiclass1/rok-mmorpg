import assert from 'node:assert'
import { dungeonFloors } from '../world/dungeonConfig'
import { rollGearAffixes } from './rollGearAffixes'
import { loadRoContent } from '../../content/ro/loadContent'
import {
  isRolledItemId,
  parseRolledBaseItemId,
  rollDungeonGear,
  rollDungeonMvpGearDrops,
} from './rolledItem'

function run() {
  const floor = dungeonFloors()[0]
  const item = rollDungeonGear(floor, true, () => 0.1, 'swordman')
  assert.ok(item, 'mvp roll should produce gear')
  assert.equal(item!.slots, 2)
  assert.deepEqual(item!.cards, [null, null])
  assert.equal(item!.affixes.length, 2)
  assert.ok(item!.requiredBaseLevel >= floor.minLevel)
  assert.ok(item!.requiredBaseLevel <= floor.maxLevel)
  assert.ok(isRolledItemId(item!.id))
  assert.ok(parseRolledBaseItemId(item!.id))

  const base = loadRoContent().items.find((i) => i.dungeonRollable !== false && i.equipSlot === 'weapon')
  assert.ok(base)
  let specialCount = 0
  for (let i = 0; i < 500; i++) {
    const rolled = rollGearAffixes('artifact', 'thief', base!, () => i / 500)
    if (rolled.effect) specialCount++
  }
  assert.ok(specialCount > 0 && specialCount < 100, 'special proc rate should be near 3%')

  const nonMvpItem = rollDungeonGear(floor, false, () => 0, 'mage')
  assert.ok(nonMvpItem, 'non-mvp roll should produce gear')
  assert.equal(nonMvpItem!.affixes.length, 2)

  const mvpDrops = rollDungeonMvpGearDrops(floor, () => 0.1, 'archer')
  assert.equal(mvpDrops.length, floor.gearDrop.mvpRolls)
  for (const drop of mvpDrops) {
    assert.ok(isRolledItemId(drop.id))
    assert.equal(drop.affixes.length, 2)
  }

  console.log('rolledItem.test.ts: ok')
}

run()
