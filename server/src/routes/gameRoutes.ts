import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { toSnakeRows } from '../lib/rowMaps.js'
import { runEdgeHandler } from '../http/edgeAdapter.js'
import { authedUserId, requireAuth } from '../middleware/requireAuth.js'
import { handle as storageTransfer } from '../edge/storage-transfer.js'
import { handle as savePoint } from '../edge/save-point.js'
import { handle as teleport } from '../edge/teleport.js'
import { handle as portalWarp } from '../edge/portal-warp.js'
import { handle as tradeManage } from '../edge/trade-manage.js'
import { handle as partyManage } from '../edge/party-manage.js'
import { handle as duelManage } from '../edge/duel-manage.js'
import { handle as guildManage } from '../edge/guild-manage.js'
import { handle as vendorManage } from '../edge/vendor-manage.js'
import { handle as dungeonManage } from '../edge/dungeon-manage.js'
import { handle as gmCommand } from '../edge/gm-command.js'
import { handle as combatReport } from '../edge/combat-report.js'
import { handle as lootManage } from '../edge/loot-manage.js'
import { handle as npcShopBuy } from '../edge/npc-shop-buy.js'
import { handle as adminPanel } from '../edge/admin-panel.js'

export const gameRoutes = Router()

gameRoutes.use(requireAuth)

gameRoutes.get('/trade/:sessionId/offers', async (req, res) => {
  const sessionId = req.params.sessionId
  const trade = await prisma.tradeSession.findUnique({ where: { id: sessionId } })
  if (!trade) {
    res.status(404).json({ error: 'Trade not found' })
    return
  }
  const userId = authedUserId(req)
  const owned = await prisma.character.findFirst({
    where: {
      userId,
      id: { in: [trade.initiatorCharacterId, trade.partnerCharacterId] },
    },
  })
  if (!owned) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const offers = await prisma.tradeOffer.findMany({ where: { tradeSessionId: sessionId } })
  res.json({ offers: toSnakeRows(offers as Record<string, unknown>[]) })
})

function post(path: string, handler: (req: globalThis.Request) => Promise<globalThis.Response>) {
  gameRoutes.post(path, (req: Request, res: Response) => {
    void runEdgeHandler(req, res, handler)
  })
}

post('/storage/transfer', storageTransfer)
post('/save-point', savePoint)
post('/teleport', teleport)
post('/portal-warp', portalWarp)
post('/trade', tradeManage)
post('/party', partyManage)
post('/duel', duelManage)
post('/guild', guildManage)
post('/vendor', vendorManage)
post('/dungeon', dungeonManage)
post('/gm/command', gmCommand)
post('/combat/report', combatReport)
post('/loot', lootManage)
post('/shop/buy-rolled', npcShopBuy)
post('/admin', adminPanel)
