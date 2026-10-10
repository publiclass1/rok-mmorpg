import type { PartyRequestRow, PartyRow } from '../types/database'
import { apiFetch } from './http'
import { partyManage } from './api'

export type PartyMemberInfo = {
  characterId: string
  name: string
}

export type PartySnapshot = {
  party: PartyRow
  members: PartyMemberInfo[]
} | null

export async function loadPartyForCharacter(characterId: string): Promise<PartySnapshot> {
  const data = await apiFetch<{
    party: PartyRow | null
    characters: Array<{ id: string; name: string }>
    members: Array<{ character_id: string }>
  }>(`/api/party/me?characterId=${encodeURIComponent(characterId)}`)

  if (!data.party) return null

  const nameById = new Map((data.characters ?? []).map((c) => [c.id, c.name]))
  const members: PartyMemberInfo[] = (data.members ?? []).map((m) => ({
    characterId: m.character_id,
    name: nameById.get(m.character_id) ?? 'Adventurer',
  }))

  return { party: data.party, members }
}

export async function loadPendingPartyRequests(characterId: string): Promise<PartyRequestRow[]> {
  const data = await apiFetch<{ requests: PartyRequestRow[] }>(
    `/api/party/requests?characterId=${encodeURIComponent(characterId)}`,
  )
  return data.requests ?? []
}

export function partyMemberIds(snapshot: PartySnapshot): string[] {
  return snapshot?.members.map((m) => m.characterId) ?? []
}

export async function createParty(characterId: string, name: string): Promise<void> {
  await partyManage({ action: 'create', characterId, name: name.trim() })
}
