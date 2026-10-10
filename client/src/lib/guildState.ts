import type { GuildMemberRow, GuildRow } from '../types/database'
import { apiFetch } from './http'

export type GuildSnapshot = {
  guild: GuildRow
  members: Array<{ characterId: string; name: string; role: GuildMemberRow['role'] }>
} | null

export async function loadGuildForCharacter(characterId: string): Promise<GuildSnapshot> {
  const data = await apiFetch<{
    guild: GuildRow | null
    members: Array<{ character_id: string; role: GuildMemberRow['role'] }>
    characters: Array<{ id: string; name: string }>
  }>(`/api/guild/me?characterId=${encodeURIComponent(characterId)}`)

  if (!data.guild) return null

  const nameById = new Map((data.characters ?? []).map((c) => [c.id, c.name]))
  const members = (data.members ?? []).map((m) => ({
    characterId: m.character_id,
    name: nameById.get(m.character_id) ?? 'Adventurer',
    role: m.role,
  }))

  return { guild: data.guild, members }
}
