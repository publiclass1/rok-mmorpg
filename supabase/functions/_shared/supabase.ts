import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function createAuthedClient(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
  }

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
}

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

export async function requireUser(client: ReturnType<typeof createAuthedClient>): Promise<User> {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  return data.user
}

export async function getOwnedCharacter(
  client: ReturnType<typeof createAuthedClient>,
  userId: string,
  characterId: string,
) {
  const { data, error } = await client
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
  if (!data) {
    throw new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 })
  }
  return data
}

const NPC_INTERACT_DISTANCE = 80

export async function assertNearNpc(
  service: ReturnType<typeof createServiceClient>,
  mapId: string,
  x: number,
  y: number,
  npcId: string,
) {
  const { data: npc, error } = await service
    .from('npc_definitions')
    .select('*')
    .eq('id', npcId)
    .maybeSingle()

  if (error || !npc) {
    throw new Response(JSON.stringify({ error: 'NPC not found' }), { status: 404 })
  }
  if (npc.map_id !== mapId) {
    throw new Response(JSON.stringify({ error: 'NPC not on this map' }), { status: 400 })
  }

  const dx = npc.x - x
  const dy = npc.y - y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > NPC_INTERACT_DISTANCE) {
    throw new Response(JSON.stringify({ error: 'Too far from NPC' }), { status: 400 })
  }

  return npc
}
