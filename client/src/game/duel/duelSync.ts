import type { DuelSyncPayload } from '../events'
import type { DuelSessionRow } from '../../types/database'
import {
  opponentCharacterIdFromDuel,
  opponentSnapshotFromDuelRow,
} from './duelCombatSnapshot'

export function duelRowToSyncPayload(duel: DuelSessionRow, myCharacterId: string): DuelSyncPayload | null {
  if (duel.state !== 'countdown' && duel.state !== 'active' && duel.state !== 'completed') {
    return null
  }
  const fightStartsAt = duel.fight_starts_at ? Date.parse(duel.fight_starts_at) : null
  return {
    duelSessionId: duel.id,
    opponentCharacterId: opponentCharacterIdFromDuel(duel, myCharacterId),
    opponentSnapshot: opponentSnapshotFromDuelRow(duel, myCharacterId),
    fightStartsAt: Number.isFinite(fightStartsAt) ? fightStartsAt : null,
    state: duel.state,
    winnerCharacterId: duel.winner_character_id,
  }
}

export function isDuelCombatPhase(sync: DuelSyncPayload | null): boolean {
  if (!sync) return false
  if (sync.state !== 'countdown' && sync.state !== 'active') return false
  if (!sync.fightStartsAt) return false
  return Date.now() >= sync.fightStartsAt
}
