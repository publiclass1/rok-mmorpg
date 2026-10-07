import assert from 'node:assert'
import expTablesJson from '../../../../content/ro/expTables.json'
import { calcBaseHp, calcBaseSp, derivedMaxHp, derivedMaxMp } from './statFormulas'

function run() {
  const noviceTable = expTablesJson.jobBaseHp.novice
  assert.equal(calcBaseHp('novice', 1), noviceTable[0], 'novice Lv1 base HP matches expTables reference')
  assert.equal(calcBaseHp('novice', 10), noviceTable[9], 'novice Lv10 base HP matches expTables reference')

  const knightHp = derivedMaxHp('knight', 50, 10)
  const swordHp = derivedMaxHp('swordman', 50, 10)
  assert.ok(knightHp > swordHp, 'knight should have higher max HP than swordman at same base/vit')

  assert.equal(derivedMaxHp('novice', 1, 1), Math.floor(40 * 1.01), 'VIT adds 1% to base HP')
  assert.equal(calcBaseSp('mage', 10), 10 + 10 * 6, 'mage base SP uses spJob')
  assert.equal(derivedMaxMp('mage', 10, 10), Math.floor(70 * 1.1), 'INT adds 1% to base SP')

  console.log('statFormulas.test.ts: ok')
}

run()
