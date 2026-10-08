import assert from 'node:assert'
import expTablesJson from '../../../../content/ro/expTables.json'
import {
  FLAT_MAX_HP_PER_BASE_LEVEL,
  FLAT_MAX_SP_PER_BASE_LEVEL,
  calcBaseHp,
  calcBaseSp,
  derivedMaxHp,
  derivedMaxMp,
  flatMaxHpBonus,
  flatMaxSpBonus,
} from './statFormulas'

function run() {
  const noviceTable = expTablesJson.jobBaseHp.novice
  assert.equal(calcBaseHp('novice', 1), noviceTable[0], 'novice Lv1 base HP matches expTables reference')
  assert.equal(calcBaseHp('novice', 10), noviceTable[9], 'novice Lv10 base HP matches expTables reference')

  const knightHp = derivedMaxHp('knight', 50, 10)
  const swordHp = derivedMaxHp('swordman', 50, 10)
  assert.ok(knightHp > swordHp, 'knight should have higher max HP than swordman at same base/vit')

  assert.equal(derivedMaxHp('novice', 1, 1), Math.floor(40 * 1.01), 'VIT adds 1% to base HP')
  assert.equal(calcBaseSp('mage', 10), 10 + 10 * 6, 'mage base SP uses spJob')
  assert.equal(derivedMaxMp('mage', 10, 10), Math.floor(70 * 1.1) + flatMaxSpBonus(10), 'INT adds 1% to base SP')

  assert.equal(flatMaxHpBonus(1), 0)
  assert.equal(flatMaxHpBonus(2), FLAT_MAX_HP_PER_BASE_LEVEL)
  assert.equal(flatMaxSpBonus(2), FLAT_MAX_SP_PER_BASE_LEVEL)
  const job = 'novice'
  const vit = 10
  const int = 10
  const level = 20
  assert.equal(
    derivedMaxHp(job, level, vit),
    Math.floor(calcBaseHp(job, level) * (1 + vit * 0.01)) + flatMaxHpBonus(level),
  )
  assert.equal(
    derivedMaxMp(job, level, int),
    Math.floor(Math.floor(calcBaseSp(job, level) * (1 + int * 0.01))) + flatMaxSpBonus(level),
  )
  assert.equal(
    derivedMaxHp(job, level + 1, vit) - derivedMaxHp(job, level, vit),
    Math.floor(calcBaseHp(job, level + 1) * (1 + vit * 0.01)) -
      Math.floor(calcBaseHp(job, level) * (1 + vit * 0.01)) +
      FLAT_MAX_HP_PER_BASE_LEVEL,
  )
  assert.equal(
    derivedMaxMp(job, level + 1, int) - derivedMaxMp(job, level, int),
    Math.floor(Math.floor(calcBaseSp(job, level + 1) * (1 + int * 0.01))) -
      Math.floor(Math.floor(calcBaseSp(job, level) * (1 + int * 0.01))) +
      FLAT_MAX_SP_PER_BASE_LEVEL,
  )

  console.log('statFormulas.test.ts: ok')
}

run()
