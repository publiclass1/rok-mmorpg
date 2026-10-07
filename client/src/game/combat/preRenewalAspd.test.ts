import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialCharacterState } from '../character/characterState'
import {
  calcPreRenewalAspd,
  NOVICE_UNARMED_ATTACK_INTERVAL_MS,
  playerAttackTiming,
} from './preRenewalAspd'

test('novice unarmed at 1 AGI / 1 DEX matches classic interval', () => {
  const timing = calcPreRenewalAspd({
    jobId: 'novice',
    weaponClass: 'unarmed',
    agi: 1,
    dex: 1,
    shieldEquipped: false,
  })
  assert.equal(timing.aspdDisplay, 145)
  assert.equal(timing.attackIntervalMs, NOVICE_UNARMED_ATTACK_INTERVAL_MS)
})

test('higher AGI lowers attack interval', () => {
  const low = calcPreRenewalAspd({
    jobId: 'novice',
    weaponClass: 'unarmed',
    agi: 1,
    dex: 1,
    shieldEquipped: false,
  })
  const high = calcPreRenewalAspd({
    jobId: 'novice',
    weaponClass: 'unarmed',
    agi: 50,
    dex: 1,
    shieldEquipped: false,
  })
  assert.ok(high.attackIntervalMs < low.attackIntervalMs)
  assert.ok(high.aspdDisplay > low.aspdDisplay)
})

test('shield equipped increases attack interval', () => {
  const bare = calcPreRenewalAspd({
    jobId: 'swordman',
    weaponClass: 'sword',
    agi: 30,
    dex: 30,
    shieldEquipped: false,
  })
  const shield = calcPreRenewalAspd({
    jobId: 'swordman',
    weaponClass: 'sword',
    agi: 30,
    dex: 30,
    shieldEquipped: true,
  })
  assert.ok(shield.attackIntervalMs > bare.attackIntervalMs)
  assert.ok(shield.aspdDisplay < bare.aspdDisplay)
})

test('job and weapon change base timing at 1/1', () => {
  const knightSword = calcPreRenewalAspd({
    jobId: 'knight',
    weaponClass: 'sword',
    agi: 1,
    dex: 1,
    shieldEquipped: false,
  })
  const thiefKnife = calcPreRenewalAspd({
    jobId: 'thief',
    weaponClass: 'knife',
    agi: 1,
    dex: 1,
    shieldEquipped: false,
  })
  assert.notEqual(knightSword.attackIntervalMs, thiefKnife.attackIntervalMs)
  assert.equal(knightSword.aspdDisplay, 145)
  assert.equal(thiefKnife.aspdDisplay, 150)
})

test('playerAttackTiming uses session stats and equipment', () => {
  const state = createInitialCharacterState()
  state.jobId = 'novice'
  state.agi = 40
  const timing = playerAttackTiming(state)
  assert.ok(timing.aspdDisplay > 145)
  assert.ok(timing.attackIntervalMs < NOVICE_UNARMED_ATTACK_INTERVAL_MS)
})

test('lord knight 2h sword baseline ASPD 145 at 1/1', () => {
  const timing = calcPreRenewalAspd({
    jobId: 'knight',
    weaponClass: 'sword',
    agi: 1,
    dex: 1,
    shieldEquipped: false,
  })
  assert.equal(timing.aspdDisplay, 145)
})
