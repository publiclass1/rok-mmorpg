import { applyServerProgressUpdate } from '../game/character/progressApply'
import { getCharacterSession, setCharacterSession } from '../game/character/characterSessionBridge'
import { toCharacterSheetPayload } from '../game/character/characterSheet'
import { progressFromLevels } from '../game/combat/exp'
import { emitGameEvent, sessionSyncPayload } from '../game/events'

export type AdminCharacterSyncPayload = {
  characterId: string
  zeny?: number
  progress?: {
    baseLevel: number
    baseExp: number
    jobLevel: number
    jobExp: number
    statPointsUnspent: number
    skillPointsUnspent: number
  }
}

/** Apply admin DB changes to the active in-game character (via socket). */
export function applyAdminCharacterSync(activeCharacterId: string, payload: AdminCharacterSyncPayload): boolean {
  if (payload.characterId !== activeCharacterId) return false

  if (payload.zeny != null) {
    emitGameEvent('characterZenySync', { zeny: payload.zeny })
  }

  if (payload.progress) {
    const current = getCharacterSession()
    const beforeBase = current.progress.baseLevel
    const beforeJob = current.progress.jobLevel
    const progress = progressFromLevels(
      payload.progress.baseLevel,
      payload.progress.baseExp,
      payload.progress.jobLevel,
      payload.progress.jobExp,
      current.jobId,
    )
    const { state, baseGained, jobGained } = applyServerProgressUpdate(current, progress)
    const next = {
      ...state,
      statPointsUnspent: payload.progress.statPointsUnspent,
      skillPointsUnspent: payload.progress.skillPointsUnspent,
    }
    setCharacterSession(next)
    emitGameEvent('characterSheet', toCharacterSheetPayload(next))
    emitGameEvent('sessionSync', sessionSyncPayload(structuredClone(next), { persist: false }))
    if (baseGained > 0 || jobGained > 0) {
      emitGameEvent('adminLevelUp', { baseGained, jobGained, beforeBase, beforeJob })
    }
    emitGameEvent('status', 'Your character was updated by an admin.')
  } else if (payload.zeny != null) {
    emitGameEvent('status', 'Your zeny was updated by an admin.')
  }

  return true
}
