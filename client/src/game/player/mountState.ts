import type { CharacterSessionState } from '../character/characterState'
import { activeRentalAt } from '../character/rental'
import { hasStatus, type PlayerStatusBuff } from '../character/statusEffects'

export function isOnPecoMount(
  session: CharacterSessionState,
  activeBuffs: PlayerStatusBuff[],
  now = Date.now(),
): boolean {
  if (hasStatus(activeBuffs, 'peco_ride')) return true
  const rental = activeRentalAt(session, now)
  return rental?.kind === 'peco_peco'
}
