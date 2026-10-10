import assert from 'node:assert'
import { dungeonFloors } from '../world/dungeonConfig'
import {
  affixCapPercentForRarity,
  ceilingFromCapPercent,
  rollGearAffixes,
} from './rollGearAffixes'
import { loadRoContent } from '../../content/ro/loadContent'
import {
  isRolledItemId,
  parseRolledBaseItemId,
  rollDungeonGear,
  rollDungeonMvpGearDrops,
} from './rolledItem'

function run() {
  assert.equal(ceilingFromCapPercent(1, 20, 20), 4)
  assert.equal(affixCapPercentForRarity('common'), 20)

  const floor = dungeonFloors()[0]
  const item = rollDungeonGear(floor, true, () => 0.1, 'swordman')
  assert.ok(item, 'mvp roll should produce gear')
  assert.equal(item!.slots, 2)
  assert.deepEqual(item!.cards, [null, null])
  assert.equal(item!.affixes.length, 2)
  assert.equal(item!.affixes[0].pool, 'primary')
  assert.equal(item!.affixes[1].pool, 'combat')
  const primaryMax = ceilingFromCapPercent(1, 20, affixCapPercentForRarity(item!.rarity))
  assert.ok(item!.affixes[0].value <= primaryMax)
  assert.ok(item!.requiredBaseLevel >= floor.minLevel)
  assert.ok(item!.requiredBaseLevel <= floor.maxLevel)
  assert.ok(isRolledItemId(item!.id))
  assert.ok(parseRolledBaseItemId(item!.id))

  const base = loadRoContent().items.find((i) => i.dungeonRollable !== false && i.equipSlot === 'weapon')
  assert.ok(base)

  const commonRoll = rollGearAffixes('common', 'archer', base!, () => 0.99)
  assert.equal(commonRoll.affixes.length, 2)
  assert.equal(commonRoll.effect, null)

  let mythicWithEffect = 0
  for (let i = 0; i < 400; i++) {
    const rolled = rollGearAffixes('mythic', 'thief', base!, () => i / 400)
    if (rolled.effect) {
      mythicWithEffect++
      assert.equal(rolled.effect.level, 1)
      assert.equal(rolled.effect.percent, 2.5)
    }
  }
  assert.ok(mythicWithEffect > 50 && mythicWithEffect < 150, 'mythic option 3 should proc near 25%')

  const artifactRoll = rollGearAffixes('artifact', 'thief', base!, () => 0.5)
  assert.ok(artifactRoll.effect)
  assert.equal(artifactRoll.effect!.level, 1)
  assert.equal(artifactRoll.effect!.percent, 2.5)

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
