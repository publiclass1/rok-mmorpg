import { logActivity } from '../activityLog'
import type { CharacterSheetPayload } from '../events'
import { emitGameEvent, type CharacterActionPayload } from '../events'
import { applyCharacterAction, publishSessionState } from './applyCharacterAction'
import type { CharacterSessionState } from './characterState'

type DispatchContext = {
  getSession: () => CharacterSessionState
  setSession: (state: CharacterSessionState) => void
  setSheet: (sheet: CharacterSheetPayload) => void
  persistSession?: (state: CharacterSessionState) => void
}

let context: DispatchContext | null = null

export function registerCharacterActionContext(next: DispatchContext | null) {
  context = next
}

/** Apply UI character actions (stats, skills, equip) — single entry point from React modals. */
export function dispatchCharacterAction(action: CharacterActionPayload) {
  if (!context) {
    emitGameEvent('characterAction', action)
    return
  }

  const result = applyCharacterAction(context.getSession(), action)
  if (!result.changed) {
    if (result.message) {
      emitGameEvent('status', result.message)
      if (action.type === 'raiseStat' || action.type === 'learnSkill' || action.type === 'changeJob' || action.type === 'assignSkillBar') {
        logActivity('character', result.message)
      }
    }
    return
  }

  context.setSession(result.state)
  const { sheet } = publishSessionState(result.state)
  context.setSheet(sheet)
  emitGameEvent('sessionSync', result.state)
  if (
    action.type === 'changeJob' ||
    action.type === 'assignSkillBar' ||
    action.type === 'moveSkillBar'
  ) {
    context.persistSession?.(result.state)
  }
  if (result.message && action.type === 'changeJob') {
    emitGameEvent('status', result.message)
  }
}
