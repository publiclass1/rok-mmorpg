import { apiFetch } from './http'
import type { CharacterRow } from '../types/database'

export function transferStorage(payload: {
  characterId: string
  direction: 'to_storage' | 'to_character'
  itemId: string
  quantity: number
  mapId: string
  x: number
  y: number
  npcId: string
}) {
  return apiFetch<{ ok: boolean }>('/api/storage/transfer', { method: 'POST', body: JSON.stringify(payload) })
}

export function savePoint(payload: {
  characterId: string
  mapId: string
  x: number
  y: number
  npcId: string
}) {
  return apiFetch<{ ok: boolean }>('/api/save-point', { method: 'POST', body: JSON.stringify(payload) })
}

export function teleport(payload: {
  characterId: string
  mapId: string
  x: number
  y: number
  npcId: string
  destinationMapId: string
}) {
  return apiFetch<{ character: CharacterRow }>('/api/teleport', { method: 'POST', body: JSON.stringify(payload) })
}

export function portalWarp(payload: {
  characterId: string
  mapId: string
  x: number
  y: number
  portalId: string
}) {
  return apiFetch<{ character: CharacterRow }>('/api/portal-warp', { method: 'POST', body: JSON.stringify(payload) })
}

export function tradeManage(payload: Record<string, unknown>) {
  return apiFetch<{ ok?: boolean; trade?: import('../types/database').TradeSessionRow }>('/api/trade', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function partyManage(payload: Record<string, unknown>) {
  return apiFetch<{
    ok?: boolean
    request?: import('../types/database').PartyRequestRow
    party?: import('../types/database').PartyRow
    partyId?: string
  }>('/api/party', { method: 'POST', body: JSON.stringify(payload) })
}

export function duelManage(payload: Record<string, unknown>) {
  return apiFetch<{
    ok?: boolean
    hit?: boolean
    damage?: number
    critical?: boolean
    targetCharacterId?: string
    targetHp?: number
    duel?: import('../types/database').DuelSessionRow
    opponentCharacterId?: string
    opponentSnapshot?: import('../game/duel/duelCombatSnapshot').DuelCombatSnapshot
  }>('/api/duel', { method: 'POST', body: JSON.stringify(payload) })
}

export function guildManage(payload: Record<string, unknown>) {
  return apiFetch<{ ok?: boolean; guild?: import('../types/database').GuildRow }>('/api/guild', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function dungeonManage(payload: Record<string, unknown>) {
  return apiFetch<{
    character?: import('../types/database').CharacterRow
    instance?: import('../types/database').DungeonInstanceRow
    recovered?: boolean
    reward?: { zeny: number; baseExp: number; jobExp: number }
    claims?: Array<{ characterId: string; zeny: number; baseExp: number; jobExp: number }>
  }>('/api/dungeon', { method: 'POST', body: JSON.stringify(payload) })
}

export function vendorManage(payload: Record<string, unknown>) {
  return apiFetch<{ ok?: boolean; stall?: import('../types/database').VendorStallRow; zenySpent?: number }>(
    '/api/vendor',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function gmCommand(payload: { characterId: string; command: string }) {
  return apiFetch<{
    ok: boolean
    message: string
    targetId?: string
    targetName?: string
    newZeny?: number
  }>('/api/gm/command', { method: 'POST', body: JSON.stringify(payload) })
}

export function progressSave(payload: {
  characterId: string
  progress: Record<string, unknown>
  skills: { skill_id: string; level: number }[]
  equipment: { slot: string; item_id: string; instance_id?: string | null }[]
}) {
  return apiFetch<{ ok: boolean }>(`/api/characters/${payload.characterId}/progress`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function combatReport(payload: {
  characterId: string
  mapId: string
  spawnIndex: number
  mobDefId: string
  x: number
  y: number
}) {
  return apiFetch<{
    ok: boolean
    baseExp: number
    jobExp: number
    zeny: number
    itemIds: string[]
    progress: { baseLevel: number; baseExp: number; jobLevel: number; jobExp: number }
    zenyTotal: number
    sessionInventory: unknown
    drops: Array<{
      id: string
      map_id: string
      item_id: string
      x: number
      y: number
      owner_character_id: string
      available_at: string
      expires_at: string
    }>
  }>('/api/combat/report', { method: 'POST', body: JSON.stringify(payload) })
}

export type FieldMapDrop = {
  id: string
  map_id: string
  item_id: string
  x: number
  y: number
  owner_character_id: string
  available_at: string
  expires_at: string
}

export function lootManage(payload: { action: 'list' | 'pickup'; characterId: string; dropId?: string }) {
  return apiFetch<{ drops?: FieldMapDrop[]; ok?: boolean; itemId?: string; sessionInventory?: unknown }>(
    '/api/loot',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export function characterEconomyAdjust(payload: { characterId: string; delta: number; reason?: string }) {
  const action = payload.delta < 0 ? 'spend' : 'credit'
  return apiFetch<{ ok: boolean; zeny: number }>(`/api/characters/${payload.characterId}/economy`, {
    method: 'POST',
    body: JSON.stringify({
      action,
      characterId: payload.characterId,
      delta: payload.delta,
      reason: payload.reason,
    }),
  })
}

export function duelAttack(payload: {
  action: 'attack'
  characterId: string
  duelSessionId: string
  targetCharacterId: string
  skillId?: string
  skillLevel?: number
}) {
  return duelManage(payload)
}
