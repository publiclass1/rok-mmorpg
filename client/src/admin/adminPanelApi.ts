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

export type AdminGrantLevelsProgress = {
  baseLevel: number
  jobLevel: number
  statPointsUnspent: number
  skillPointsUnspent: number
}

export type AdminCharacterDetails = {
  id: string
  name: string
  baseLevel: number
  jobLevel: number
  jobId: string
}

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

export function fetchAdminCharacterById(
  characterId: string,
): Promise<{ character: AdminCharacterDetails }> {
  return invokeAdmin({ action: 'get_character', characterId: characterId.trim() })
}

export function grantLevelsById(
  characterId: string,
  baseDelta: number,
  jobDelta: number,
): Promise<{ ok: boolean; message: string; progress: AdminGrantLevelsProgress }> {
  return invokeAdmin({
    action: 'grant_levels',
    characterId: characterId.trim(),
    baseDelta,
    jobDelta,
  })
}

export function fetchGameSettings(): Promise<GameSettings> {
  return invokeAdmin({ action: 'get_settings' })
}

export function updateGameSettings(settings: GameSettings): Promise<GameSettings> {
  return invokeAdmin({ action: 'update_settings', settings })
}
