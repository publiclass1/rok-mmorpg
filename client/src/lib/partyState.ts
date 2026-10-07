import type { PartyRequestRow, PartyRow } from '../types/database'
import { supabase } from './supabase'

export type PartyMemberInfo = {
  characterId: string
  name: string
}

export type PartySnapshot = {
  party: PartyRow
  members: PartyMemberInfo[]
} | null

export async function loadPartyForCharacter(characterId: string): Promise<PartySnapshot> {
  const { data: membership } = await supabase
    .from('party_members')
    .select('party_id')
    .eq('character_id', characterId)
    .maybeSingle()

  if (!membership) return null

  const { data: party } = await supabase.from('parties').select('*').eq('id', membership.party_id).maybeSingle()
  if (!party) return null

  const { data: memberRows } = await supabase
    .from('party_members')
    .select('character_id')
    .eq('party_id', membership.party_id)

  const ids = (memberRows ?? []).map((m) => m.character_id)
  if (ids.length === 0) return { party, members: [] }

  const { data: chars } = await supabase.from('characters').select('id, name').in('id', ids)
  const members: PartyMemberInfo[] = (chars ?? []).map((c) => ({
    characterId: c.id,
    name: c.name,
  }))

  return { party, members }
}

export async function loadPendingPartyRequests(characterId: string): Promise<PartyRequestRow[]> {
  const { data } = await supabase
    .from('party_requests')
    .select('*')
    .eq('to_character_id', characterId)
    .eq('status', 'pending')
  return data ?? []
}

export function partyMemberIds(snapshot: PartySnapshot): string[] {
  return snapshot?.members.map((m) => m.characterId) ?? []
}

/** Creates a party via Postgres RPC (same API host as character save; no Edge Function). */
export async function createParty(characterId: string, name: string): Promise<void> {
  const { error } = await supabase.rpc('create_party', {
    p_character_id: characterId,
    p_name: name.trim(),
  })
  if (error) {
    throw new Error(error.message)
  }
}
