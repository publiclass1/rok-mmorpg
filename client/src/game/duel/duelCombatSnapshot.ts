import type { CharacterSessionState, EquipSlot } from '../character/characterState'
import { createDefaultEquipment } from '../character/characterState'
import { effectiveStats } from '../character/effectiveStats'

const EQUIP_SLOTS: EquipSlot[] = [
  'weapon',
  'headTop',
  'headMiddle',
  'headLower',
  'armor',
  'garment',
  'boots',
  'offhand',
  'accLeft',
  'accRight',
]

export type DuelCombatSnapshot = {
  baseLevel: number
  jobId: string
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
  equipment: Record<EquipSlot, string | null>
}

export function parseDuelCombatSnapshot(raw: unknown): DuelCombatSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.baseLevel !== 'number' || typeof o.jobId !== 'string') return null
  const equipment = createDefaultEquipment()
  if (o.equipment && typeof o.equipment === 'object') {
    const eq = o.equipment as Record<string, unknown>
    for (const slot of EQUIP_SLOTS) {
      const v = eq[slot]
      equipment[slot] = typeof v === 'string' ? v : null
    }
  }
  return {
    baseLevel: o.baseLevel,
    jobId: o.jobId,
    str: typeof o.str === 'number' ? o.str : 1,
    agi: typeof o.agi === 'number' ? o.agi : 1,
    vit: typeof o.vit === 'number' ? o.vit : 1,
    int: typeof o.int === 'number' ? o.int : 1,
    dex: typeof o.dex === 'number' ? o.dex : 1,
    luk: typeof o.luk === 'number' ? o.luk : 1,
    equipment,
  }
}

export function opponentSnapshotFromDuelRow(
  duel: {
    challenger_character_id: string
    opponent_character_id: string
    challenger_snapshot: unknown
    opponent_snapshot: unknown
  },
  myCharacterId: string,
): DuelCombatSnapshot | null {
  const raw =
    duel.challenger_character_id === myCharacterId
      ? duel.opponent_snapshot
      : duel.challenger_snapshot
  return parseDuelCombatSnapshot(raw)
}

export function opponentCharacterIdFromDuel(
  duel: { challenger_character_id: string; opponent_character_id: string },
  myCharacterId: string,
): string {
  return duel.challenger_character_id === myCharacterId
    ? duel.opponent_character_id
    : duel.challenger_character_id
}

export function combatSnapshotFromSession(state: CharacterSessionState): DuelCombatSnapshot {
  const stats = effectiveStats(state)
  return {
    baseLevel: state.progress.baseLevel,
    jobId: state.jobId,
    str: stats.str,
    agi: stats.agi,
    vit: stats.vit,
    int: stats.int,
    dex: stats.dex,
    luk: stats.luk,
    equipment: { ...state.equipment },
  }
}
