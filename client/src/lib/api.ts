import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'
import { supabase } from './supabase'

async function formatInvokeError(name: string, error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.clone().json()) as { error?: string }
      if (body?.error) return body.error
    } catch {
      /* ignore parse errors */
    }
    return `Request to ${name} failed (${error.context.status}).`
  }
  if (error instanceof FunctionsFetchError) {
    const url = import.meta.env.VITE_SUPABASE_URL ?? ''
    if (!url || url.includes('placeholder')) {
      return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env and restart the dev server (or set them in your host build settings).'
    }
    const cause = error.context
    const detail = cause instanceof Error ? cause.message : String(cause)
    return `Could not reach ${name} (${detail}). If other game features work, check ad blockers or try another browser. For hosted builds, confirm env vars were set before deploy.`
  }
  if (error instanceof FunctionsRelayError) {
    return `Supabase relay error calling ${name}. Try again in a moment.`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    throw new Error(await formatInvokeError(name, error))
  }
  if (data?.error) {
    throw new Error(String(data.error))
  }
  return data as T
}

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
  return invoke<{ ok: boolean }>('storage-transfer', payload)
}

export function savePoint(payload: {
  characterId: string
  mapId: string
  x: number
  y: number
  npcId: string
}) {
  return invoke<{ ok: boolean }>('save-point', payload)
}

export function teleport(payload: {
  characterId: string
  mapId: string
  x: number
  y: number
  npcId: string
  destinationMapId: string
}) {
  return invoke<{ character: import('../types/database').CharacterRow }>('teleport', payload)
}

export function portalWarp(payload: {
  characterId: string
  mapId: string
  x: number
  y: number
  portalId: string
}) {
  return invoke<{ character: import('../types/database').CharacterRow }>('portal-warp', payload)
}

export function tradeManage(payload: Record<string, unknown>) {
  return invoke<{ ok?: boolean; trade?: import('../types/database').TradeSessionRow }>(
    'trade-manage',
    payload,
  )
}

export function partyManage(payload: Record<string, unknown>) {
  return invoke<{
    ok?: boolean
    request?: import('../types/database').PartyRequestRow
    party?: import('../types/database').PartyRow
    partyId?: string
  }>('party-manage', payload)
}

export function duelManage(payload: Record<string, unknown>) {
  return invoke<{
    ok?: boolean
    hit?: boolean
    damage?: number
    critical?: boolean
    targetCharacterId?: string
    targetHp?: number
    duel?: import('../types/database').DuelSessionRow
    opponentCharacterId?: string
    opponentSnapshot?: import('../game/duel/duelCombatSnapshot').DuelCombatSnapshot
  }>('duel-manage', payload)
}

export function guildManage(payload: Record<string, unknown>) {
  return invoke<{ ok?: boolean; guild?: import('../types/database').GuildRow }>('guild-manage', payload)
}

export function dungeonManage(payload: Record<string, unknown>) {
  return invoke<{
    character?: import('../types/database').CharacterRow
    instance?: import('../types/database').DungeonInstanceRow
  }>('dungeon-manage', payload)
}

export function vendorManage(payload: Record<string, unknown>) {
  return invoke<{ ok?: boolean; stall?: import('../types/database').VendorStallRow; zenySpent?: number }>(
    'vendor-manage',
    payload,
  )
}

export function gmCommand(payload: { characterId: string; command: string }) {
  return invoke<{
    ok: boolean
    message: string
    targetId?: string
    targetName?: string
    newZeny?: number
  }>('gm-command', payload)
}

export function progressSave(payload: {
  characterId: string
  progress: Record<string, unknown>
  skills: { skill_id: string; level: number }[]
  equipment: { slot: string; item_id: string; instance_id?: string | null }[]
}) {
  return invoke<{ ok: boolean }>('progress-save', payload)
}

export function combatReport(payload: {
  characterId: string
  mapId: string
  spawnIndex: number
  mobDefId: string
  x: number
  y: number
}) {
  return invoke<{
    ok: boolean
    baseExp: number
    jobExp: number
    zeny: number
    itemIds: string[]
    progress: { baseLevel: number; baseExp: number; jobLevel: number; jobExp: number }
    zenyTotal: number
    sessionInventory: unknown
  }>('combat-report', payload)
}

export function characterEconomyAdjust(payload: { characterId: string; delta: number; reason?: string }) {
  const action = payload.delta < 0 ? 'spend' : 'credit'
  return invoke<{ ok: boolean; zeny: number }>('character-economy', {
    action,
    characterId: payload.characterId,
    delta: payload.delta,
    reason: payload.reason,
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
