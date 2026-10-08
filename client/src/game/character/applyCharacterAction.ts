import { loadRoContent } from '../../content/ro/loadContent'
import { logActivity } from '../activityLog'
import type { CharacterActionPayload } from '../events'
import { syncDerivedVitals, toCharacterSheetPayload } from './characterSheet'
import {
  assignSkillBarSlot,
  equipItemWithInventoryTransfer,
  learnOrLevelSkill,
  relocateSkillOnBar,
  placeSkillOnBar,
  hasAllocatedSkillPoints,
  hasRaisedPrimaryStats,
  raiseStat,
  reconcileProgressBudgetForSave,
  resetAllocatedPrimaryStats,
  resetAllocatedSkills,
  useConsumableFromSession,
  type CharacterSessionState,
} from './characterState'
import { checkCanEquipItem } from './equipRequirements'
import { getItemDisplayName } from './itemCatalog'
import { getEquipmentDefinition } from './equipmentConfig'
import { isRolledGearItemId } from './itemCatalog'
import { applyJobChange } from './jobChange'
import { applyRental, clearActiveRental, rentalCatalogEntry } from './rental'
import { isSkillBarIndexInRange, skillBarsEqual } from './skillBars'
import { canPlaceOnSkillBar } from './skillBarEntry'
import { canLearnSkill, JOB_NAMES, SKILLS } from './skillsConfig'
import {
  addItemsToSessionInventory,
  removeItemFromSessionByItemId,
} from './sessionInventory'

export type ApplyResult = {
  state: CharacterSessionState
  changed: boolean
  message?: string
}

export function applyCharacterAction(
  state: CharacterSessionState,
  action: CharacterActionPayload,
): ApplyResult {
  if (action.type === 'raiseStat') {
    const before = state[action.stat]
    const next = syncDerivedVitals(raiseStat(state, action.stat))
    if (next[action.stat] > before) {
      logActivity('character', `Raised ${action.stat.toUpperCase()} to ${next[action.stat]}.`)
      return { state: next, changed: true }
    }
    return { state, changed: false, message: 'Not enough stat points.' }
  }

  if (action.type === 'resetStats') {
    if (!hasRaisedPrimaryStats(state)) {
      return { state, changed: false, message: 'No allocated stats to reset.' }
    }
    const next = syncDerivedVitals(resetAllocatedPrimaryStats(state))
    logActivity('character', 'Reset base stats and refunded stat points.')
    return { state: next, changed: true, message: 'Stats reset.' }
  }

  if (action.type === 'resetSkills') {
    if (!hasAllocatedSkillPoints(state.skills)) {
      return { state, changed: false, message: 'No skills to reset.' }
    }
    const next = syncDerivedVitals(reconcileProgressBudgetForSave(resetAllocatedSkills(state)))
    logActivity('character', 'Reset skills and refunded skill points.')
    return { state: next, changed: true, message: 'Skills reset.' }
  }

  if (action.type === 'learnSkill') {
    const def = SKILLS[action.skillId]
    if (!def) return { state, changed: false }
    const before = state.skills[action.skillId] ?? 0
    if (
      !canLearnSkill(
        def,
        state.jobId,
        state.progress.jobLevel,
        before,
        state.skillPointsUnspent,
        state.skills,
      )
    ) {
      return { state, changed: false, message: 'Cannot learn skill (requirements not met).' }
    }
    const next = syncDerivedVitals(learnOrLevelSkill(state, action.skillId, def.maxLevel))
    const after = next.skills[action.skillId] ?? 0
    if (after > before) {
      logActivity('character', `${def.name} skill level ${after}.`)
      return { state: next, changed: true }
    }
    return { state, changed: false, message: 'Cannot learn skill (need job level or skill points).' }
  }

  if (action.type === 'changeJob') {
    if (state.jobId === action.jobId) {
      return { state, changed: false, message: 'You already have this job.' }
    }
    const next = syncDerivedVitals(applyJobChange(state, action.jobId))
    const jobName = JOB_NAMES[action.jobId] ?? action.jobId
    logActivity('character', `Job change complete — now a ${jobName}.`)
    if (loadRoContent().jobStarterGear.kits[action.jobId]) {
      logActivity('character', 'Received starter equipment.')
    }
    return { state: next, changed: true, message: `You are now a ${jobName}!` }
  }

  if (action.type === 'assignSkillBar') {
    if (!isSkillBarIndexInRange(action.bar, action.slot)) return { state, changed: false }
    if (action.skillId === null) {
      if (state.skillBars[action.bar][action.slot] == null) return { state, changed: false }
      return { state: assignSkillBarSlot(state, action.bar, action.slot, null), changed: true }
    }
    if (!canPlaceOnSkillBar(action.skillId, state.jobId, state.skills)) {
      return { state, changed: false, message: 'That skill cannot be placed on the bar.' }
    }
    const next = placeSkillOnBar(state, action.bar, action.slot, action.skillId)
    if (next.skillBars[action.bar][action.slot] !== action.skillId) return { state, changed: false }
    return { state: next, changed: true }
  }

  if (action.type === 'moveSkillBar') {
    if (
      (action.fromBar === action.toBar && action.fromSlot === action.toSlot) ||
      !isSkillBarIndexInRange(action.fromBar, action.fromSlot) ||
      !isSkillBarIndexInRange(action.toBar, action.toSlot)
    ) {
      return { state, changed: false }
    }
    const next = relocateSkillOnBar(
      state,
      action.fromBar,
      action.fromSlot,
      action.toBar,
      action.toSlot,
    )
    if (skillBarsEqual(next.skillBars, state.skillBars)) return { state, changed: false }
    return { state: next, changed: true }
  }

  if (action.type === 'equip') {
    if (action.itemId) {
      const def = getEquipmentDefinition(action.itemId)
      if (!def || def.slot !== action.slot) {
        return { state, changed: false, message: 'Cannot equip item in that slot.' }
      }
      const equipCheck = checkCanEquipItem(
        { baseLevel: state.progress.baseLevel, jobId: state.jobId },
        action.itemId,
      )
      if (equipCheck.ok === false) {
        return { state, changed: false, message: equipCheck.reason }
      }
    }
    const transfer = equipItemWithInventoryTransfer(state, action.slot, action.itemId, {
      sessionInventoryIndex: action.sessionInventoryIndex,
    })
    if (transfer.ok === false) {
      return { state, changed: false, message: transfer.reason }
    }
    if (transfer.state === state) {
      return { state, changed: false }
    }
    const next = syncDerivedVitals(transfer.state)
    const label = action.itemId ? getItemDisplayName(action.itemId) : 'empty'
    logActivity(
      'character',
      action.itemId ? `Equipped ${label} (${action.slot}).` : `Unequipped ${action.slot}.`,
    )
    return { state: next, changed: true }
  }

  if (action.type === 'useConsumable') {
    if (state.hp <= 0) {
      return { state, changed: false, message: 'You cannot use items while defeated.' }
    }
    const itemId = state.sessionInventory[action.sessionInventoryIndex]?.itemId
    const result = useConsumableFromSession(state, action.sessionInventoryIndex)
    if (result.ok === false) {
      return { state, changed: false, message: result.reason }
    }
    const next = syncDerivedVitals(result.state)
    logActivity('character', `Used ${getItemDisplayName(itemId ?? 'item')}.`)
    return { state: next, changed: true }
  }

  if (action.type === 'shopAddItems') {
    const qty = Math.floor(action.quantity)
    if (qty <= 0) return { state, changed: false, message: 'Invalid quantity.' }
    const ids = Array.from({ length: qty }, () => action.itemId)
    const nextInv = addItemsToSessionInventory(state.sessionInventory, ids)
    const next = syncDerivedVitals({ ...state, sessionInventory: nextInv })
    logActivity('character', `Bought ${qty}× ${getItemDisplayName(action.itemId)}.`)
    return { state: next, changed: true }
  }

  if (action.type === 'shopRemoveItem') {
    if (isRolledGearItemId(action.itemId)) {
      return { state, changed: false, message: 'Dungeon gear cannot be sold to NPCs yet.' }
    }
    const qty = Math.floor(action.quantity)
    if (qty <= 0) return { state, changed: false, message: 'Invalid quantity.' }
    const nextInv = removeItemFromSessionByItemId(state.sessionInventory, action.itemId, qty)
    if (!nextInv) {
      return { state, changed: false, message: 'Not enough items to sell.' }
    }
    const next = syncDerivedVitals({ ...state, sessionInventory: nextInv })
    logActivity('character', `Sold ${qty}× ${getItemDisplayName(action.itemId)}.`)
    return { state: next, changed: true }
  }

  if (action.type === 'restoreVitals') {
    if (state.hp <= 0) {
      return { state, changed: false, message: 'Return to your save point to recover.' }
    }
    const sheet = toCharacterSheetPayload(syncDerivedVitals(state))
    const next = syncDerivedVitals({ ...state, hp: sheet.hpMax, mp: sheet.mpMax })
    logActivity('character', 'HP and SP fully restored.')
    return { state: next, changed: true, message: 'HP and SP restored.' }
  }

  if (action.type === 'respawnPartial') {
    const sheet = toCharacterSheetPayload(syncDerivedVitals(state))
    const hp = Math.max(1, Math.floor(sheet.hpMax * 0.5))
    const mp = Math.floor(sheet.mpMax * 0.5)
    const next = syncDerivedVitals({ ...state, hp, mp })
    logActivity('character', 'Revived at save point with partial HP and SP.')
    return { state: next, changed: true, message: 'You have been revived.' }
  }

  if (action.type === 'rentEquipment') {
    const entry = rentalCatalogEntry(action.kind)
    const next = syncDerivedVitals(applyRental(state, action.kind))
    logActivity('character', `Rented ${entry.name}.`)
    return { state: next, changed: true, message: `${entry.name} rental started.` }
  }

  if (action.type === 'dismissRental') {
    if (!state.activeRental) {
      return { state, changed: false, message: 'No active rental.' }
    }
    const name = rentalCatalogEntry(state.activeRental.kind).name
    const next = syncDerivedVitals(clearActiveRental(state))
    logActivity('character', `Returned ${name}.`)
    return { state: next, changed: true, message: `${name} returned.` }
  }

  return { state, changed: false }
}

export function publishSessionState(state: CharacterSessionState) {
  const sheet = toCharacterSheetPayload(state)
  return { state, sheet }
}
