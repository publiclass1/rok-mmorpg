import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { authRoutes } from './routes/authRoutes.js'
import { characterRoutes } from './routes/characterRoutes.js'
import { dataRoutes } from './routes/dataRoutes.js'
import { gameRoutes } from './routes/gameRoutes.js'
import { profileRoutes } from './routes/profileRoutes.js'
import { socialRoutes } from './routes/socialRoutes.js'

export function createApp() {
  const app = express()
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(cors({ origin: corsOrigin, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/characters', characterRoutes)
  app.use('/api', gameRoutes)
  app.use('/api', dataRoutes)
  app.use('/api/profile', profileRoutes)
  app.use('/api', socialRoutes)

  return app
}
