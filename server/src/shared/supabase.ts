import { createServiceClient } from '../lib/dbClient.js'
import { bearerFromRequest, verifyAccessToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { toSnakeRow } from '../lib/rowMaps.js'
import { getRequest } from '../lib/requestContext.js'
import { jsonCorsHeaders } from './cors.js'

export type AuthedClient = ReturnType<typeof createServiceClient>

export function createAuthedClient(_req: Request): AuthedClient {
  return createServiceClient()
}

export { createServiceClient }

export type User = { id: string }

export async function requireUser(_client: AuthedClient): Promise<User> {
  const req = getRequest()
  const token = bearerFromRequest(req)
  if (!token) {
    throw new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: jsonCorsHeaders,
    })
  }
  const verified = verifyAccessToken(token)
  if (!verified) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonCorsHeaders,
    })
  }
  return { id: verified.userId }
}

export async function getOwnedCharacter(
  _client: AuthedClient,
  userId: string,
  characterId: string,
) {
  const row = await prisma.character.findFirst({
    where: { id: characterId, userId },
  })
  if (!row) {
    throw new Response(JSON.stringify({ error: 'Character not found' }), {
      status: 404,
      headers: jsonCorsHeaders,
    })
  }
  return toSnakeRow(row as Record<string, unknown>)
}

export async function assertNearNpc(
  _service: ReturnType<typeof createServiceClient>,
  mapId: string,
  _x: number,
  _y: number,
  npcId: string,
) {
  const npc = await prisma.npcDefinition.findUnique({ where: { id: npcId } })
  if (!npc) {
    throw new Response(JSON.stringify({ error: 'NPC not found' }), {
      status: 404,
      headers: jsonCorsHeaders,
    })
  }
  const snake = toSnakeRow(npc as Record<string, unknown>)
  if (snake.map_id !== mapId) {
    throw new Response(JSON.stringify({ error: 'NPC not on this map' }), {
      status: 400,
      headers: jsonCorsHeaders,
    })
  }
  return snake
}
