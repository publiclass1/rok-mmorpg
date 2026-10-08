import { logActivity } from '../activityLog'
import type { CharacterSheetPayload } from '../events'
import { emitGameEvent, sessionSyncPayload, type CharacterActionPayload } from '../events'
import { applyCharacterAction, publishSessionState } from './applyCharacterAction'
import { getCharacterSession, setCharacterSession } from './characterSessionBridge'
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
export function dispatchCharacterAction(action: CharacterActionPayload): boolean {
  if (!context) {
    emitGameEvent('characterAction', action)
    return false
  }

  const result = applyCharacterAction(getCharacterSession(), action)
  if (!result.changed) {
    if (result.message) {
      emitGameEvent('status', result.message)
      if (
        action.type === 'raiseStat' ||
        action.type === 'resetStats' ||
        action.type === 'resetSkills' ||
        action.type === 'learnSkill' ||
        action.type === 'changeJob' ||
        action.type === 'assignSkillBar'
      ) {
        logActivity('character', result.message)
      }
    }
    return false
  }

  setCharacterSession(result.state)
  const synced = getCharacterSession()
  const { sheet } = publishSessionState(synced)
  context.setSheet(sheet)
  emitGameEvent('sessionSync', sessionSyncPayload(structuredClone(synced)))
  emitGameEvent('characterSheet', sheet)
  if (
    action.type === 'changeJob' ||
    action.type === 'assignSkillBar' ||
    action.type === 'moveSkillBar' ||
    action.type === 'resetStats' ||
    action.type === 'resetSkills' ||
    action.type === 'learnSkill' ||
    action.type === 'raiseStat'
  ) {
    context.persistSession?.(synced)
  }
  if (
    result.message &&
    (action.type === 'changeJob' || action.type === 'resetStats' || action.type === 'resetSkills')
  ) {
    emitGameEvent('status', result.message)
    logActivity('character', result.message)
  }
  return true
}
