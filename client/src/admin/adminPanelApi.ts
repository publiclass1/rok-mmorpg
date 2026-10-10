import { getAdminPassword } from './adminAuth'
import { apiFetch } from '../lib/http'

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

async function invokeAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const password = getAdminPassword()
  if (!password) {
    throw new Error('Admin password required')
  }
  return apiFetch<T>('/api/admin', {
    method: 'POST',
    headers: { 'X-Admin-Password': password },
    body: JSON.stringify({ ...body, adminPassword: password }),
  })
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
