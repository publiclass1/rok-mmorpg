import assert from 'node:assert/strict'
import test from 'node:test'
import { consumeConsumableFromSession, createInitialCharacterState } from '../character/characterState'
import { addItemsToSessionInventory } from '../character/sessionInventory'
import { applyPotionBuff, sumPotionBuffAffixes } from './potionBuffs'

test('applyPotionBuff stacks distinct instances and sums ASPD', () => {
  const t0 = 1_000_000
  const first = applyPotionBuff([], 'aspd_potion_3', t0)
  assert.equal(first.ok, true)
  const second = applyPotionBuff(first.buffs, 'aspd_potion_5', t0 + 1)
  assert.equal(second.ok, true)
  assert.equal(second.buffs.length, 2)
  assert.notEqual(second.buffs[0].statusId, second.buffs[1].statusId)
  const totals = sumPotionBuffAffixes(second.buffs)
  assert.equal(totals.aspd, 8)
})

test('consumeConsumableFromSession consumes buff-only potion', () => {
  let state = createInitialCharacterState()
  const beforeLen = state.sessionInventory.length
  state = {
    ...state,
    sessionInventory: addItemsToSessionInventory(state.sessionInventory, ['atk_potion_20']),
  }
  const idx = state.sessionInventory.findIndex((s) => s.itemId === 'atk_potion_20')
  assert.ok(idx >= 0)
  const hpBefore = state.hp
  const result = consumeConsumableFromSession(state, idx)
  assert.equal(result.ok, true)
  const atkLeft = result.state.sessionInventory.filter((s) => s.itemId === 'atk_potion_20').length
  assert.equal(atkLeft, 0)
  assert.equal(result.state.sessionInventory.length, beforeLen)
  assert.equal(result.state.hp, hpBefore)
})
