import { supabase } from './supabase'

export async function upsertCharacterPresence(
  characterId: string,
  mapId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase.from('character_presence').upsert({
    character_id: characterId,
    map_id: mapId,
    name,
    last_seen: new Date().toISOString(),
  })
  if (error) {
    console.warn('Presence upsert failed', error.message)
  }
}

export async function clearCharacterPresence(characterId: string): Promise<void> {
  const { error } = await supabase.from('character_presence').delete().eq('character_id', characterId)
  if (error) {
    console.warn('Presence clear failed', error.message)
  }
}
