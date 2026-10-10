import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toSnakeRow, toSnakeRows } from '../lib/rowMaps.js'
import { authedUserId, requireAuth } from '../middleware/requireAuth.js'

export const socialRoutes = Router()

socialRoutes.use(requireAuth)

function partyCharacterSummary(
  c: {
    id: string
    name: string
    gender: string
    bodyColor: number
    hairColor: number
    eyeColor: number
    clothesColor: number
    progress: {
      jobId: string
      baseLevel: number
      jobLevel: number
      hp: number | null
      mp: number | null
      vit: number
      statInt: number
    } | null
  },
) {
  const p = c.progress
  return {
    id: c.id,
    name: c.name,
    gender: c.gender,
    body_color: c.bodyColor,
    hair_color: c.hairColor,
    eye_color: c.eyeColor,
    clothes_color: c.clothesColor,
    job_id: p?.jobId ?? 'novice',
    base_level: p?.baseLevel ?? 1,
    job_level: p?.jobLevel ?? 1,
    hp: p?.hp ?? null,
    mp: p?.mp ?? null,
    vit: p?.vit ?? 1,
    stat_int: p?.statInt ?? 1,
  }
}

socialRoutes.get('/party/me', async (req, res) => {
  const characterId = String(req.query.characterId ?? '')
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: authedUserId(req) },
  })
  if (!character) {
    res.status(404).json({ error: 'Character not found' })
    return
  }

  const membership = await prisma.partyMember.findUnique({ where: { characterId } })
  if (!membership) {
    res.json({ party: null, members: [] })
    return
  }

  const party = await prisma.party.findUnique({ where: { id: membership.partyId } })
  const members = await prisma.partyMember.findMany({ where: { partyId: membership.partyId } })
  const ids = members.map((m) => m.characterId)
  const chars = await prisma.character.findMany({
    where: { id: { in: ids } },
    include: { progress: true },
  })

  const payload: Record<string, unknown> = {
    party: party ? toSnakeRow(party as Record<string, unknown>) : null,
    members: toSnakeRows(members as Record<string, unknown>[]),
    characters: chars.map((c) => partyCharacterSummary(c)),
  }

  if (party?.leaderCharacterId === characterId) {
    const pending = await prisma.partyRequest.findMany({
      where: { partyId: membership.partyId, kind: 'apply', status: 'pending' },
      include: { from: { include: { progress: true } } },
    })
    payload.pending_applications = pending.map((req) => ({
      ...toSnakeRow(req as Record<string, unknown>),
      from_character: partyCharacterSummary(req.from),
    }))
  }

  res.json(payload)
})

socialRoutes.get('/party/requests', async (req, res) => {
  const characterId = String(req.query.characterId ?? '')
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: authedUserId(req) },
  })
  if (!character) {
    res.status(404).json({ error: 'Character not found' })
    return
  }
  const requests = await prisma.partyRequest.findMany({
    where: { toCharacterId: characterId, status: 'pending' },
  })
  res.json({ requests: toSnakeRows(requests as Record<string, unknown>[]) })
})

socialRoutes.get('/guild/me', async (req, res) => {
  const characterId = String(req.query.characterId ?? '')
  const character = await prisma.character.findFirst({
    where: { id: characterId, userId: authedUserId(req) },
  })
  if (!character) {
    res.status(404).json({ error: 'Character not found' })
    return
  }

  const membership = await prisma.guildMember.findUnique({ where: { characterId } })
  if (!membership) {
    res.json({ guild: null, members: [] })
    return
  }

  const guild = await prisma.guild.findUnique({ where: { id: membership.guildId } })
  const members = await prisma.guildMember.findMany({ where: { guildId: membership.guildId } })
  const ids = members.map((m) => m.characterId)
  const chars = await prisma.character.findMany({ where: { id: { in: ids } } })
  res.json({
    guild: guild ? toSnakeRow(guild as Record<string, unknown>) : null,
    members: toSnakeRows(members as Record<string, unknown>[]),
    characters: toSnakeRows(chars as Record<string, unknown>[]),
  })
})
