import type { GuildMemberRow, GuildRow } from '../types/database'
import { supabase } from './supabase'

export type GuildSnapshot = {
  guild: GuildRow
  members: Array<{ characterId: string; name: string; role: GuildMemberRow['role'] }>
} | null

export async function loadGuildForCharacter(characterId: string): Promise<GuildSnapshot> {
  const { data: membership } = await supabase
    .from('guild_members')
    .select('guild_id, role')
    .eq('character_id', characterId)
    .maybeSingle()

  if (!membership) return null

  const { data: guild } = await supabase.from('guilds').select('*').eq('id', membership.guild_id).maybeSingle()
  if (!guild) return null

  const { data: memberRows } = await supabase
    .from('guild_members')
    .select('character_id, role')
    .eq('guild_id', membership.guild_id)

  const ids = (memberRows ?? []).map((m) => m.character_id)
  const { data: chars } = await supabase.from('characters').select('id, name').in('id', ids)

  const nameById = new Map((chars ?? []).map((c) => [c.id, c.name]))
  const members = (memberRows ?? []).map((m) => ({
    characterId: m.character_id,
    name: nameById.get(m.character_id) ?? 'Adventurer',
    role: m.role,
  }))

  return { guild, members }
}
