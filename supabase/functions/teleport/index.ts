import { corsHeaders } from '../_shared/cors.ts'
import {
  assertNearNpc,
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

type Body = {
  characterId: string
  mapId: string
  x: number
  y: number
  npcId: string
  destinationMapId: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body

    const service = createServiceClient()
    const npc = await assertNearNpc(service, body.mapId, body.x, body.y, body.npcId)
    if (npc.npc_type !== 'teleport') {
      return new Response(JSON.stringify({ error: 'Not a teleport NPC' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const destinations = (npc.config?.destinations ?? []) as Array<{
      map_id: string
      label: string
      x: number
      y: number
    }>

    const dest = destinations.find((d) => d.map_id === body.destinationMapId)
    if (!dest) {
      return new Response(JSON.stringify({ error: 'Invalid destination' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const character = await getOwnedCharacter(client, user.id, body.characterId)

    const { data: updated, error } = await service
      .from('characters')
      .update({
        map_id: dest.map_id,
        x: dest.x,
        y: dest.y,
      })
      .eq('id', character.id)
      .select('*')
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ character: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
