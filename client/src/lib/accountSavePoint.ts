import { PRONTERA_TOWN_SPAWN } from './pronteraSpawn'
import { supabase } from './supabase'

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
  const { data, error } = await supabase
    .from('profiles')
    .select('save_map_id, save_x, save_y')
    .single()

  if (error || !data) {
    console.warn('loadAccountSavePoint', error?.message)
    return DEFAULT_SAVE
  }

  return {
    mapId: data.save_map_id ?? DEFAULT_SAVE.mapId,
    x: data.save_x ?? DEFAULT_SAVE.x,
    y: data.save_y ?? DEFAULT_SAVE.y,
  }
}
