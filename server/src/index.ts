import { createServer } from 'node:http'
import { createApp } from './app.js'
import { initSocket } from './realtime/socket.js'

const port = Number(process.env.PORT ?? 3001)
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

const app = createApp()
const httpServer = createServer(app)
initSocket(httpServer, corsOrigin)

httpServer.listen(port, () => {
  console.log(`ROK server listening on http://localhost:${port}`)
})
