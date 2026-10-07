import { setRolledItemRegistry } from '../items/rolledItemRegistry'
import { syncDerivedVitals } from './characterSheet'
import { createInitialCharacterState, type CharacterSessionState } from './characterState'

type SessionBridge = {
  get: () => CharacterSessionState
  set: (state: CharacterSessionState) => void
}

let bridge: SessionBridge | null = null
let fallbackSession: CharacterSessionState = createInitialCharacterState()

export function registerCharacterSessionBridge(next: SessionBridge | null) {
  bridge = next
}

export function isCharacterSessionBridgeRegistered(): boolean {
  return bridge != null
}

export function getCharacterSession(): CharacterSessionState {
  return bridge?.get() ?? fallbackSession
}

export function setCharacterSession(state: CharacterSessionState): void {
  const synced = syncDerivedVitals(state)
  setRolledItemRegistry(synced.rolledItems)
  if (bridge) {
    bridge.set(synced)
  } else {
    fallbackSession = synced
  }
}

export function updateCharacterSession(
  updater: (state: CharacterSessionState) => CharacterSessionState,
): CharacterSessionState {
  const next = updater(getCharacterSession())
  setCharacterSession(next)
  return getCharacterSession()
}

/** Seed Phaser boot before React bridge is wired (tests / edge cases). */
export function seedFallbackCharacterSession(state: CharacterSessionState): void {
  if (!bridge) {
    fallbackSession = syncDerivedVitals(state)
  }
}
