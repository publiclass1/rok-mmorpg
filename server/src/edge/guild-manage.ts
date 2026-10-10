// @ts-nocheck
import { corsHeaders } from '../shared/cors.js'
import { GUILD_CREATE_ZENY } from '../shared/social.js'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../shared/supabase.js'

type Action = 'create' | 'leave' | 'disband'

type Body = {
  action: Action
  characterId: string
  name?: string
  tag?: string
}

async function getGuildMembership(service: ReturnType<typeof createServiceClient>, characterId: string) {
  const { data } = await service
    .from('guild_members')
    .select('guild_id, character_id, role')
    .eq('character_id', characterId)
    .maybeSingle()
  return data
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body
    const service = createServiceClient()

    const character = await getOwnedCharacter(client, user.id, body.characterId)

    if (body.action === 'create') {
      const name = (body.name ?? '').trim()
      const tag = (body.tag ?? '').trim().toUpperCase()
      if (name.length < 2 || name.length > 24) {
        return new Response(JSON.stringify({ error: 'Invalid guild name' }), { status: 400 })
      }
      if (tag.length < 2 || tag.length > 4 || !/^[A-Z0-9]+$/.test(tag)) {
        return new Response(JSON.stringify({ error: 'Tag must be 2-4 letters/numbers' }), {
          status: 400,
        })
      }

      const existing = await getGuildMembership(service, body.characterId)
      if (existing) {
        return new Response(JSON.stringify({ error: 'Already in a guild' }), { status: 400 })
      }

      if (character.zeny < GUILD_CREATE_ZENY) {
        return new Response(JSON.stringify({ error: `Need ${GUILD_CREATE_ZENY} zeny` }), {
          status: 400,
        })
      }

      const { data: guild, error } = await service
        .from('guilds')
        .insert({
          name,
          tag,
          leader_character_id: body.characterId,
        })
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }

      await service.from('guild_members').insert({
        guild_id: guild.id,
        character_id: body.characterId,
        role: 'leader',
      })

      await service
        .from('characters')
        .update({ zeny: character.zeny - GUILD_CREATE_ZENY })
        .eq('id', body.characterId)

      return new Response(JSON.stringify({ guild }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'leave') {
      const member = await getGuildMembership(service, body.characterId)
      if (!member) {
        return new Response(JSON.stringify({ error: 'Not in a guild' }), { status: 400 })
      }

      const { data: guild } = await service.from('guilds').select('*').eq('id', member.guild_id).single()

      if (guild?.leader_character_id === body.characterId) {
        return new Response(JSON.stringify({ error: 'Leader must disband instead of leave' }), {
          status: 400,
        })
      }

      await service.from('guild_members').delete().eq('character_id', body.characterId)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'disband') {
      const member = await getGuildMembership(service, body.characterId)
      if (!member || member.role !== 'leader') {
        return new Response(JSON.stringify({ error: 'Only guild leader can disband' }), { status: 403 })
      }
      await service.from('guild_members').delete().eq('guild_id', member.guild_id)
      await service.from('guilds').delete().eq('id', member.guild_id)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}