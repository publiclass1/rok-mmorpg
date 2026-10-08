import { corsHeaders } from '../_shared/cors.ts'
import {
  assertNearNpc,
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'
import dungeonsShared from '../_shared/dungeons.json' with { type: 'json' }

type FloorMeta = {
  id: string
  mapId: string
  minLevel: number
  maxLevel: number
  entry: { x: number; y: number }
  mvpDefId: string
  totalSpawns: number
}

const FLOORS: FloorMeta[] = (dungeonsShared as { floors: FloorMeta[] }).floors

type Action = 'enter' | 'report_kill' | 'report_mvp_kill'

type Body = {
  action: Action
  characterId: string
  mapId?: string
  x?: number
  y?: number
  npcId?: string
  floorId?: string
  instanceId?: string
  spawnIndex?: number
}

async function getMembership(service: ReturnType<typeof createServiceClient>, characterId: string) {
  const { data } = await service
    .from('party_members')
    .select('party_id, character_id')
    .eq('character_id', characterId)
    .maybeSingle()
  return data
}

function floorById(floorId: string): FloorMeta | undefined {
  return FLOORS.find((f) => f.id === floorId)
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
    const character = await getOwnedCharacter(client, user.id, body.characterId)

    if (body.action === 'enter') {
      if (!body.mapId || body.x == null || body.y == null || !body.npcId || !body.floorId) {
        return new Response(JSON.stringify({ error: 'Missing enter fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const npc = await assertNearNpc(service, character.map_id, character.x, character.y, body.npcId)
      if (npc.npc_type !== 'dungeon') {
        return new Response(JSON.stringify({ error: 'Not a dungeon NPC' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const floor = floorById(body.floorId)
      if (!floor) {
        return new Response(JSON.stringify({ error: 'Invalid dungeon floor' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const membership = await getMembership(service, character.id)
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Only parties can enter the dungeon' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: progress, error: progErr } = await service
        .from('character_progress')
        .select('base_level')
        .eq('character_id', character.id)
        .maybeSingle()

      if (progErr) {
        return new Response(JSON.stringify({ error: progErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const baseLevel = progress?.base_level ?? 1
      if (baseLevel < floor.minLevel) {
        return new Response(
          JSON.stringify({ error: `Requires base level ${floor.minLevel} (you are ${baseLevel}).` }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      let instance = null
      const { data: existing } = await service
        .from('dungeon_instances')
        .select('*')
        .eq('party_id', membership.party_id)
        .eq('floor_id', floor.id)
        .neq('status', 'cleared')
        .maybeSingle()

      if (existing) {
        instance = existing
      } else {
        const { data: created, error: createErr } = await service
          .from('dungeon_instances')
          .insert({
            party_id: membership.party_id,
            floor_id: floor.id,
            map_id: floor.mapId,
            total_spawns: floor.totalSpawns,
            status: 'active',
            mvp_alive: false,
            killed_spawns: [],
          })
          .select('*')
          .single()
        if (createErr || !created) {
          return new Response(JSON.stringify({ error: createErr?.message ?? 'Could not create instance' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        instance = created
      }

      const { data: updated, error: warpErr } = await service
        .from('characters')
        .update({
          map_id: floor.mapId,
          x: floor.entry.x,
          y: floor.entry.y,
        })
        .eq('id', character.id)
        .select('*')
        .single()

      if (warpErr || !updated) {
        return new Response(JSON.stringify({ error: warpErr?.message ?? 'Warp failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ character: updated, instance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'report_kill' || body.action === 'report_mvp_kill') {
      if (!body.instanceId) {
        return new Response(JSON.stringify({ error: 'Missing instanceId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const membership = await getMembership(service, character.id)
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Not in a party' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: inst, error: instErr } = await service
        .from('dungeon_instances')
        .select('*')
        .eq('id', body.instanceId)
        .maybeSingle()

      if (instErr || !inst || inst.party_id !== membership.party_id) {
        return new Response(JSON.stringify({ error: 'Invalid dungeon instance' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (body.action === 'report_kill') {
        if (body.spawnIndex == null) {
          return new Response(JSON.stringify({ error: 'Missing spawnIndex' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { data: updated, error: rpcErr } = await service.rpc('dungeon_report_kill', {
          p_instance_id: body.instanceId,
          p_spawn_index: body.spawnIndex,
        })
        if (rpcErr) {
          return new Response(JSON.stringify({ error: rpcErr.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ instance: updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: cleared, error: clearErr } = await service
        .from('dungeon_instances')
        .update({ status: 'cleared', mvp_alive: false, updated_at: new Date().toISOString() })
        .eq('id', body.instanceId)
        .select('*')
        .single()

      if (clearErr) {
        return new Response(JSON.stringify({ error: clearErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ instance: cleared }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
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
