import { logActivity } from '../activityLog'
import type { CharacterActionPayload } from '../events'
import { syncDerivedVitals, toCharacterSheetPayload } from './characterSheet'
import {
  equipItem,
  learnOrLevelSkill,
  raiseStat,
  type CharacterSessionState,
} from './characterState'
import { EQUIPMENT } from './equipmentConfig'
import { SKILLS } from './skillsConfig'

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
    const next = learnOrLevelSkill(state, action.skillId, def.maxLevel)
    const after = next.skills[action.skillId] ?? 0
    if (after > before) {
      logActivity('character', `${def.name} skill level ${after}.`)
      return { state: next, changed: true }
    }
    return { state, changed: false, message: 'Cannot learn skill (need job level or skill points).' }
  }

  if (action.type === 'equip') {
    const next = syncDerivedVitals(equipItem(state, action.slot, action.itemId))
    const label = action.itemId ? EQUIPMENT[action.itemId]?.name ?? action.itemId : 'empty'
    logActivity(
      'character',
      action.itemId ? `Equipped ${label} (${action.slot}).` : `Unequipped ${action.slot}.`,
    )
    return { state: next, changed: true }
  }

  return { state, changed: false }
}

export function publishSessionState(state: CharacterSessionState) {
  const sheet = toCharacterSheetPayload(state)
  return { state, sheet }
}
