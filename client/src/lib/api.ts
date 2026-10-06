import { supabase } from './supabase'

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    const hint =
      error.message.includes('Edge Function') || error.message.includes('Failed to send')
        ? ` Deploy it with: npx supabase functions deploy ${name}`
        : ''
    throw new Error(`${error.message}${hint}`)
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

export function guildManage(payload: Record<string, unknown>) {
  return invoke<{ ok?: boolean; guild?: import('../types/database').GuildRow }>('guild-manage', payload)
}

export function vendorManage(payload: Record<string, unknown>) {
  return invoke<{ ok?: boolean; stall?: import('../types/database').VendorStallRow; zenySpent?: number }>(
    'vendor-manage',
    payload,
  )
}
