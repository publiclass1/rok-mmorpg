import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toSnakeRow, toSnakeRows } from '../lib/rowMaps.js'
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js'

export const dataRoutes = Router()

dataRoutes.use(requireAuth)

dataRoutes.get('/items', async (_req, res) => {
  const rows = await prisma.item.findMany()
  res.json({ items: toSnakeRows(rows as Record<string, unknown>[]) })
})

dataRoutes.get('/storage', async (req, res) => {
  const { userId } = req as AuthedRequest
  const rows = await prisma.accountStorage.findMany({ where: { userId } })
  res.json({ storage: toSnakeRows(rows as Record<string, unknown>[]) })
})

dataRoutes.get('/dungeon/instance', async (req, res) => {
  const partyId = String(req.query.partyId ?? '')
  const floorId = String(req.query.floorId ?? '')
  const row = await prisma.dungeonInstance.findFirst({
    where: { partyId, floorId, status: { not: 'cleared' } },
  })
  res.json({ instance: row ? toSnakeRow(row as Record<string, unknown>) : null })
})

dataRoutes.get('/duel/active', async (req, res) => {
  const characterId = String(req.query.characterId ?? '')
  const row = await prisma.duelSession.findFirst({
    where: {
      OR: [{ challengerCharacterId: characterId }, { opponentCharacterId: characterId }],
      state: { in: ['pending', 'countdown', 'active'] },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json({ duel: row ? toSnakeRow(row as Record<string, unknown>) : null })
})

dataRoutes.get('/vendor/:characterId/stall', async (req, res) => {
  const row = await prisma.vendorStall.findUnique({ where: { characterId: req.params.characterId } })
  res.json({ stall: row ? toSnakeRow(row as Record<string, unknown>) : null })
})

dataRoutes.get('/vendor/:characterId/listings', async (req, res) => {
  const rows = await prisma.vendorListing.findMany({ where: { characterId: req.params.characterId } })
  res.json({ listings: toSnakeRows(rows as Record<string, unknown>[]) })
})

dataRoutes.get('/npcs', async (req, res) => {
  const mapId = String(req.query.mapId ?? '')
  const rows = mapId
    ? await prisma.npcDefinition.findMany({ where: { mapId } })
    : await prisma.npcDefinition.findMany()
  res.json({ npcs: toSnakeRows(rows as Record<string, unknown>[]) })
})

dataRoutes.put('/presence/:characterId', async (req, res) => {
  const { userId } = req as AuthedRequest
  const characterId = req.params.characterId
  const character = await prisma.character.findFirst({ where: { id: characterId, userId } })
  if (!character) {
    res.status(404).json({ error: 'Character not found' })
    return
  }
  await prisma.characterPresence.upsert({
    where: { characterId },
    create: {
      characterId,
      mapId: String(req.body.map_id ?? character.mapId),
      name: String(req.body.name ?? character.name),
    },
    update: {
      mapId: String(req.body.map_id ?? character.mapId),
      name: String(req.body.name ?? character.name),
      lastSeen: new Date(),
    },
  })
  res.json({ ok: true })
})

dataRoutes.delete('/presence/:characterId', async (req, res) => {
  const { userId } = req as AuthedRequest
  const character = await prisma.character.findFirst({
    where: { id: req.params.characterId, userId },
  })
  if (!character) {
    res.status(404).json({ error: 'Character not found' })
    return
  }
  await prisma.characterPresence.deleteMany({ where: { characterId: character.id } })
  res.json({ ok: true })
})
