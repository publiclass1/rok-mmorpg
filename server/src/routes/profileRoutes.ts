import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js'

export const profileRoutes = Router()

profileRoutes.use(requireAuth)

profileRoutes.get('/save-point', async (req, res) => {
  const { userId } = req as AuthedRequest
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({ save_map_id: user.saveMapId, save_x: user.saveX, save_y: user.saveY })
})

profileRoutes.patch('/save-point', async (req, res) => {
  const { userId } = req as AuthedRequest
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      saveMapId: String(req.body.save_map_id ?? req.body.mapId ?? 'prontera'),
      saveX: Number(req.body.save_x ?? req.body.x ?? 480),
      saveY: Number(req.body.save_y ?? req.body.y ?? 360),
    },
  })
  res.json({ save_map_id: user.saveMapId, save_x: user.saveX, save_y: user.saveY })
})
