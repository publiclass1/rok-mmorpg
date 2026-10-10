import { Router } from 'express'
import {
  hashPassword,
  normalizeUsername,
  signAccessToken,
  validateUsername,
  verifyPassword,
} from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { toSnakeRow } from '../lib/rowMaps.js'
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js'

export const authRoutes = Router()

authRoutes.post('/register', async (req, res) => {
  const username = normalizeUsername(String(req.body.username ?? ''))
  const password = String(req.body.password ?? '')
  const validation = validateUsername(username)
  if (validation) {
    res.status(400).json({ error: validation })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    res.status(400).json({ error: 'That username is already taken.' })
    return
  }

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      displayName: username,
    },
  })

  const token = signAccessToken(user.id)
  res.json({ token, user: { id: user.id, username: user.username } })
})

authRoutes.post('/login', async (req, res) => {
  const username = normalizeUsername(String(req.body.username ?? ''))
  const password = String(req.body.password ?? '')
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Wrong username or password.' })
    return
  }
  const token = signAccessToken(user.id)
  res.json({ token, user: { id: user.id, username: user.username } })
})

authRoutes.get('/me', requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.displayName,
      save_map_id: user.saveMapId,
      save_x: user.saveX,
      save_y: user.saveY,
    },
  })
})
