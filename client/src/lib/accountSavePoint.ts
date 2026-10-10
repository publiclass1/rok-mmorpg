import { PRONTERA_TOWN_SPAWN } from './pronteraSpawn'
import { apiFetch } from './http'

export type AccountSavePoint = {
  mapId: string
  x: number
  y: number
}

const DEFAULT_SAVE: AccountSavePoint = {
  mapId: 'prontera',
  x: PRONTERA_TOWN_SPAWN.x,
  y: PRONTERA_TOWN_SPAWN.y,
}

export async function loadAccountSavePoint(): Promise<AccountSavePoint> {
  try {
    const data = await apiFetch<{ save_map_id: string; save_x: number; save_y: number }>(
      '/api/profile/save-point',
    )
    return {
      mapId: data.save_map_id ?? DEFAULT_SAVE.mapId,
      x: data.save_x ?? DEFAULT_SAVE.x,
      y: data.save_y ?? DEFAULT_SAVE.y,
    }
  } catch (err) {
    console.warn('loadAccountSavePoint', err)
    return DEFAULT_SAVE
  }
}
