// @ts-nocheck
import { corsHeaders } from '../shared/cors.js'
import {
  assertNearNpc,
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../shared/supabase.js'

type Body = {
  characterId: string
  mapId: string
  x: number
  y: number
  npcId: string
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
    const npc = await assertNearNpc(service, character.map_id, character.x, character.y, body.npcId)
    if (npc.npc_type !== 'save') {
      return new Response(JSON.stringify({ error: 'Not a save NPC' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error } = await service
      .from('profiles')
      .update({
        save_map_id: character.map_id,
        save_x: character.x,
        save_y: character.y,
      })
      .eq('id', user.id)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}