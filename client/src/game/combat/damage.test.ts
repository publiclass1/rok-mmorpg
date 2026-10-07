import assert from 'node:assert'
import { createInitialCharacterState } from '../character/characterState'
import { progressFromLevels } from './exp'
import {
  calcCritChancePercent,
  calcCritDamageMultiplier,
  calcPlayerMagicSkillVsMob,
  calcPlayerMagicVsMobDamage,
  calcPlayerVsMobDamage,
  calcStatusMatkMax,
  calcStatusMatkMin,
  rollCriticalHit,
} from './damage'
import type { MobDefinition } from './mobConfig'
import { PORING } from './mobConfig'

function mockMob(overrides: Partial<MobDefinition>): MobDefinition {
  return { ...PORING, ...overrides }
}

function run() {
  assert.equal(calcCritChancePercent(7), 7)
  assert.equal(calcCritChancePercent(0), 0)
  assert.equal(calcCritChancePercent(10, { defenderLuk: 15 }), 7)
  assert.equal(calcCritChancePercent(0, { attackerLuk: 9 }), 3)
  assert.equal(calcCritChancePercent(5, { attackerLuk: 9 }), 8)

  assert.equal(calcCritDamageMultiplier(9), 1.43)
  assert.equal(calcCritDamageMultiplier(2), 1.4)

  assert.equal(rollCriticalHit(50, () => 0.49), true)
  assert.equal(rollCriticalHit(50, () => 0.5), false)
  assert.equal(rollCriticalHit(0, () => 0), false)

  assert.equal(calcStatusMatkMin(33), 49)
  assert.equal(calcStatusMatkMax(33), 69)

  let session = createInitialCharacterState()
  session = {
    ...session,
    luk: 9,
    str: 20,
    dex: 10,
    int: 40,
    progress: progressFromLevels(10, 0, 1, 0, 'novice'),
    equipment: { ...session.equipment, weapon: null, accLeft: 'clip' },
  }

  const highFleeMob = mockMob({ flee: 9999, def: 0, mdef: 0 })
  const alwaysCrit = () => 0
  const { hit: critHit, critical } = calcPlayerVsMobDamage(session, highFleeMob, { rng: alwaysCrit })
  assert.equal(critHit, true, 'crit should connect despite extreme FLEE')
  assert.equal(critical, true)

  const neverCritThenMiss = () => 0.999
  const miss = calcPlayerVsMobDamage(session, highFleeMob, { rng: neverCritThenMiss })
  assert.equal(miss.hit, false, 'non-crit should miss vs extreme FLEE')

  const highDefMob = mockMob({ def: 80, flee: 0, mdef: 0 })
  const noCrit = () => 0.999
  const normal = calcPlayerVsMobDamage(session, highDefMob, { rng: noCrit })
  const crit = calcPlayerVsMobDamage(session, highDefMob, { rng: alwaysCrit })
  assert.ok(crit.damage > normal.damage, 'crit should deal more than normal vs high DEF')
  assert.ok(normal.damage <= 5, 'high DEF should greatly reduce non-crit damage')

  const magicMdefMob = mockMob({ mdef: 50, def: 0 })
  const magicCrit = calcPlayerMagicVsMobDamage(session, magicMdefMob, {
    skillModifier: 1,
    attackElement: 'neutral',
    rng: () => 0,
  })
  const magicNormal = calcPlayerMagicVsMobDamage(session, magicMdefMob, {
    skillModifier: 1,
    attackElement: 'neutral',
    rng: () => 0.999,
  })
  assert.equal(magicCrit.critical, true)
  assert.ok(magicCrit.damage > magicNormal.damage, 'magic crit should exceed normal vs MDEF')

  const fireMob = mockMob({ element: 'fire', mdef: 0, def: 0 })
  const boltL1 = calcPlayerMagicSkillVsMob(session, fireMob, 'fire_bolt', 1, { rng: () => 0.5 })
  const boltL5 = calcPlayerMagicSkillVsMob(session, fireMob, 'fire_bolt', 5, { rng: () => 0.5 })
  assert.equal(boltL1.hits, 1)
  assert.equal(boltL5.hits, 5)
  assert.ok(boltL5.totalDamage > boltL1.totalDamage, 'more bolt hits should deal more total damage')

  const undeadMob = mockMob({ element: 'undead', mdef: 0, def: 0 })
  const neutralMob = mockMob({ element: 'neutral', mdef: 0, def: 0 })
  const soulUndead = calcPlayerMagicSkillVsMob(session, undeadMob, 'soul_strike', 5, { rng: () => 0.5 })
  const soulNeutral = calcPlayerMagicSkillVsMob(session, neutralMob, 'soul_strike', 5, { rng: () => 0.5 })
  assert.ok(soulUndead.totalDamage > soulNeutral.totalDamage, 'soul strike bonus vs undead')

  console.log('damage.test.ts: ok')
}

run()
