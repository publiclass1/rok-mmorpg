import { jsonCorsHeaders, corsHeaders, withCors } from '../_shared/cors.ts'
import { createAuthedClient, createServiceClient, getOwnedCharacter, requireUser } from '../_shared/supabase.ts'

const DROP_SELECT = 'id, map_id, item_id, x, y, owner_character_id, available_at, expires_at'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const service = createServiceClient()
    const body = await req.json() as Record<string, unknown>
    const characterId = String(body.characterId ?? '')
    const character = await getOwnedCharacter(client, user.id, characterId)

    await service.from('field_map_drops').delete().is('collected_at', null).lte('expires_at', new Date().toISOString())

    if (body.action === 'list') {
      const { data, error } = await service.from('field_map_drops').select(DROP_SELECT)
        .eq('map_id', character.map_id).is('collected_at', null).gt('expires_at', new Date().toISOString())
      if (error) throw new Response(JSON.stringify({ error: error.message }), { status: 400, headers: jsonCorsHeaders })
      return new Response(JSON.stringify({ drops: data ?? [] }), { headers: jsonCorsHeaders })
    }

    if (body.action === 'pickup') {
      const dropId = String(body.dropId ?? '')
      const { data, error } = await service.rpc('pickup_field_map_drop', {
        p_drop_id: dropId, p_character_id: character.id, p_map_id: character.map_id,
        p_x: Number(character.x), p_y: Number(character.y),
      })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 409, headers: jsonCorsHeaders })
      return new Response(JSON.stringify({ ok: true, ...data }), { headers: jsonCorsHeaders })
    }
    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: jsonCorsHeaders })
  } catch (err) {
    if (err instanceof Response) return withCors(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: jsonCorsHeaders })
  }
})
