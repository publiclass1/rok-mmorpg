import { apiFetch } from './http'

export async function upsertCharacterPresence(payload: {
  characterId: string
  mapId: string
  name: string
}): Promise<void> {
  await apiFetch(`/api/presence/${payload.characterId}`, {
    method: 'PUT',
    body: JSON.stringify({ map_id: payload.mapId, name: payload.name }),
  })
}

export async function clearCharacterPresence(characterId: string): Promise<void> {
  await apiFetch(`/api/presence/${characterId}`, { method: 'DELETE' })
}
