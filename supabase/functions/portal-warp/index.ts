import { corsHeaders } from '../_shared/cors.ts'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'
import mapPortals from '../_shared/mapPortals.json' with { type: 'json' }

type PortalDef = {
  id: string
  x: number
  y: number
  width: number
  height: number
  targetMapId: string
  targetX: number
  targetY: number
  label: string
  mode: string
}

type Body = {
  characterId: string
  mapId: string
  x: number
  y: number
  portalId: string
}

function pointInPortal(x: number, y: number, portal: PortalDef): boolean {
  return x >= portal.x && x <= portal.x + portal.width && y >= portal.y && y <= portal.y + portal.height
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body

    const portalsByMap = mapPortals.portals as Record<string, PortalDef[]>
    const list = portalsByMap[body.mapId] ?? []
    const portal = list.find((p) => p.id === body.portalId)
    if (!portal) {
      return new Response(JSON.stringify({ error: 'Portal not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!pointInPortal(body.x, body.y, portal)) {
      return new Response(JSON.stringify({ error: 'Not on portal' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await getOwnedCharacter(client, user.id, body.characterId)

    const service = createServiceClient()
    const { data: updated, error } = await service
      .from('characters')
      .update({
        map_id: portal.targetMapId,
        x: portal.targetX,
        y: portal.targetY,
      })
      .eq('id', body.characterId)
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
