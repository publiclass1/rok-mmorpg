import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toSnakeRow, toSnakeRows } from '../lib/rowMaps.js'
import { authedUserId, requireAuth } from '../middleware/requireAuth.js'
import {
  createCharacter,
  deleteCharacter,
  listCharactersForUser,
  loadCharacterSession,
  patchCharacterWorld,
} from '../services/characterService.js'
import { listCharacterSelectEntries } from '../services/characterSelectService.js'
import { runEdgeHandler } from '../http/edgeAdapter.js'
import { handle as progressSaveHandle } from '../edge/progress-save.js'

export const characterRoutes = Router()

characterRoutes.use(requireAuth)

characterRoutes.get('/', async (req, res) => {
  const characters = await listCharactersForUser(authedUserId(req))
  res.json({ characters })
})

characterRoutes.get('/select-entries', async (req, res) => {
  const data = await listCharacterSelectEntries(authedUserId(req))
  res.json(data)
})

characterRoutes.post('/', async (req, res) => {
  try {
    const character = await createCharacter(authedUserId(req), {
      name: String(req.body.name ?? '').trim(),
      slot: Number(req.body.slot),
      gender: req.body.gender,
      bodyColor: req.body.body_color,
      hairColor: req.body.hair_color,
      eyeColor: req.body.eye_color,
      clothesColor: req.body.clothes_color,
    })
    res.json({ character })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Unique constraint') || msg.includes('Unique')) {
      res.status(400).json({ error: 'That name is already taken.' })
      return
    }
    res.status(400).json({ error: msg })
  }
})

characterRoutes.delete('/:id', async (req, res) => {
  try {
    await deleteCharacter(authedUserId(req), req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

characterRoutes.get('/:id/session', async (req, res) => {
  try {
    const session = await loadCharacterSession(req.params.id, authedUserId(req))
    res.json(session)
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

characterRoutes.patch('/:id/world', async (req, res) => {
  try {
    const character = await patchCharacterWorld(authedUserId(req), req.params.id, {
      mapId: String(req.body.map_id ?? req.body.mapId),
      x: Number(req.body.x),
      y: Number(req.body.y),
    })
    res.json({ character })
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

characterRoutes.post('/:id/progress', async (req, res) => {
  req.body = { ...req.body, characterId: req.params.id }
  await runEdgeHandler(req, res, progressSaveHandle)
})

characterRoutes.post('/:id/economy', async (req, res) => {
  const { handle } = await import('../edge/character-economy.js')
  req.body = { ...req.body, characterId: req.params.id }
  await runEdgeHandler(req, res, handle)
})

characterRoutes.get('/:id/inventory', async (req, res) => {
  const character = await prisma.character.findFirst({
    where: { id: req.params.id, userId: authedUserId(req) },
  })
  if (!character) {
    res.status(404).json({ error: 'Character not found' })
    return
  }
  const rows = await prisma.characterInventory.findMany({ where: { characterId: character.id } })
  res.json({ inventory: toSnakeRows(rows as Record<string, unknown>[]) })
})
