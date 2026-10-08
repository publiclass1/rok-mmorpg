import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'
import { getAdminPassword } from './adminAuth'
import { supabase } from '../lib/supabase'

export type AdminStats = {
  totalCharacters: number
  totalAccounts: number
  totalParties: number
  totalGuilds: number
  totalVendorStalls: number
  totalZeny: number
  averageZeny: number
  totalOnline: number
  onlinePerMap: Array<{ mapId: string; count: number }>
  onlineWindowSeconds: number
}

export type AdminCharacterRow = {
  id: string
  name: string
  map_id: string
  zeny: number
  is_gm: boolean
}

export type GameSettings = { expRate: number; dropRate: number }

async function formatInvokeError(name: string, error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.clone().json()) as { error?: string }
      if (body?.error) return body.error
    } catch {
      /* ignore */
    }
    return `Request to ${name} failed (${error.context.status}).`
  }
  if (error instanceof FunctionsFetchError) {
    const url = import.meta.env.VITE_SUPABASE_URL ?? ''
    if (!url || url.includes('placeholder')) {
      return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env.'
    }
    return (
      `Could not reach ${name}. Deploy it with: npx supabase functions deploy admin-panel ` +
      `(and set ADMIN_PANEL_PASSWORD in Supabase secrets).`
    )
  }
  if (error instanceof FunctionsRelayError) {
    return `Supabase relay error calling ${name}. Try again in a moment.`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

async function invokeAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const password = getAdminPassword()
  if (!password) {
    throw new Error('Admin password required')
  }
  const { data, error } = await supabase.functions.invoke('admin-panel', {
    body: { ...body, adminPassword: password },
    headers: { 'X-Admin-Password': password },
  })
  if (error) {
    throw new Error(await formatInvokeError('admin-panel', error))
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error))
  }
  return data as T
}

export function fetchAdminStats(): Promise<AdminStats> {
  return invokeAdmin({ action: 'stats' })
}

export function searchAdminCharacters(
  q: string,
  gmOnly = false,
): Promise<{ characters: AdminCharacterRow[] }> {
  return invokeAdmin({ action: 'search_characters', q, gmOnly })
}

export function setCharacterGm(characterId: string, isGm: boolean): Promise<{ character: AdminCharacterRow }> {
  return invokeAdmin({
    action: isGm ? 'set_gm' : 'unset_gm',
    characterId,
  })
}

export function grantZenyByName(
  name: string,
  amount: number,
): Promise<{ ok: boolean; message: string; character: { id: string; name: string; zeny: number } }> {
  return invokeAdmin({ action: 'grant_zeny', name: name.trim(), amount })
}

export function fetchGameSettings(): Promise<GameSettings> {
  return invokeAdmin({ action: 'get_settings' })
}

export function updateGameSettings(settings: GameSettings): Promise<GameSettings> {
  return invokeAdmin({ action: 'update_settings', settings })
}
