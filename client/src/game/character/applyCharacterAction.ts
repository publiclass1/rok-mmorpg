import { logActivity } from '../activityLog'
import type { CharacterActionPayload } from '../events'
import { syncDerivedVitals, toCharacterSheetPayload } from './characterSheet'
import {
  assignSkillBarSlot,
  equipItemWithInventoryTransfer,
  learnOrLevelSkill,
  moveSkillBarSlot,
  placeSkillOnBar,
  raiseStat,
  useConsumableFromSession,
  type CharacterSessionState,
} from './characterState'
import { getItemDisplayName } from './itemCatalog'
import { EQUIPMENT } from './equipmentConfig'
import { applyJobChange } from './jobChange'
import { canLearnSkill, canPlaceSkillOnBar, JOB_NAMES, SKILLS } from './skillsConfig'

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
    return { state: next, changed: true, message: `You are now a ${jobName}!` }
  }

  if (action.type === 'assignSkillBar') {
    if (action.slot < 0 || action.slot > 8) return { state, changed: false }
    if (action.skillId === null) {
      if (state.skillBar[action.slot] == null) return { state, changed: false }
      return { state: assignSkillBarSlot(state, action.slot, null), changed: true }
    }
    if (!canPlaceSkillOnBar(action.skillId, state.jobId, state.skills)) {
      return { state, changed: false, message: 'That skill cannot be placed on the bar.' }
    }
    const next = placeSkillOnBar(state, action.slot, action.skillId)
    if (next.skillBar[action.slot] !== action.skillId) return { state, changed: false }
    return { state: next, changed: true }
  }

  if (action.type === 'moveSkillBar') {
    if (action.from === action.to || action.from < 0 || action.from > 8 || action.to < 0 || action.to > 8) {
      return { state, changed: false }
    }
    return { state: moveSkillBarSlot(state, action.from, action.to), changed: true }
  }

  if (action.type === 'equip') {
    if (action.itemId) {
      const def = EQUIPMENT[action.itemId]
      if (!def || def.slot !== action.slot) {
        return { state, changed: false, message: 'Cannot equip item in that slot.' }
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
    const label = action.itemId ? EQUIPMENT[action.itemId]?.name ?? action.itemId : 'empty'
    logActivity(
      'character',
      action.itemId ? `Equipped ${label} (${action.slot}).` : `Unequipped ${action.slot}.`,
    )
    return { state: next, changed: true }
  }

  if (action.type === 'useConsumable') {
    const itemId = state.sessionInventory[action.sessionInventoryIndex]?.itemId
    const result = useConsumableFromSession(state, action.sessionInventoryIndex)
    if (result.ok === false) {
      return { state, changed: false, message: result.reason }
    }
    const next = syncDerivedVitals(result.state)
    logActivity('character', `Used ${getItemDisplayName(itemId ?? 'item')}.`)
    return { state: next, changed: true }
  }

  return { state, changed: false }
}

export function publishSessionState(state: CharacterSessionState) {
  const sheet = toCharacterSheetPayload(state)
  return { state, sheet }
}
