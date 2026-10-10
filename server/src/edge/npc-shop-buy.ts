// @ts-nocheck
import { corsHeaders } from '../shared/cors.js'
import { writeAuditLog } from '../shared/auditLog.js'
import { isRarityDealerBaseItem } from '../shared/rarityDealerStock.js'
import { createServerRolledGear } from '../shared/rolledGear/createRolledItem.js'
import { parseSessionInventory, type SessionInvSlot } from '../shared/social.js'
import {
  assertNearNpc,
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../shared/supabase.js'
import { prisma } from '../lib/prisma.js'
import itemsJson from '../shared/ro/items.json' with { type: 'json' }

type PurchaseLine = { itemId: string; quantity: number }

type Body = {
  characterId: string
  npcId: string
  lines: PurchaseLine[]
}

function isRarityTabShop(config: unknown): boolean {
  return (
    config != null &&
    typeof config === 'object' &&
    (config as { shopLayout?: string }).shopLayout === 'rarityTabs'
  )
}

const ITEMS_BY_ID = Object.fromEntries(
  (itemsJson as { items: Array<{ id: string; rarity?: string; requiredBaseLevel?: number }> }).items.map(
    (i) => [i.id, i],
  ),
)

function stockPriceMap(npcConfig: Record<string, unknown>): Map<string, number> {
  const stock = npcConfig?.stock
  const map = new Map<string, number>()
  if (!Array.isArray(stock)) return map
  for (const row of stock) {
    if (row && typeof row === 'object' && typeof row.itemId === 'string') {
      const price = Number((row as { price?: number }).price)
      if (Number.isFinite(price) && price >= 0) map.set(row.itemId, Math.floor(price))
    }
  }
  return map
}

function addUniqueItems(slots: SessionInvSlot[], itemIds: string[]): SessionInvSlot[] {
  const next = [...slots]
  for (const itemId of itemIds) {
    next.push({ itemId, quantity: 1 })
  }
  return next
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body
    const service = createServiceClient()

    const character = await getOwnedCharacter(client, user.id, body.characterId)

    const npc = await assertNearNpc(
      service,
      character.map_id,
      character.x,
      character.y,
      body.npcId,
    )
    if (npc.npc_type !== 'shop') {
      return new Response(JSON.stringify({ error: 'Not a shop NPC' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!isRarityTabShop(npc.config)) {
      return new Response(JSON.stringify({ error: 'This shop does not sell rolled rarity gear' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prices = stockPriceMap((npc.config ?? {}) as Record<string, unknown>)
    const lines = Array.isArray(body.lines) ? body.lines : []
    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: 'No items to buy' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalCost = 0
    const rolls: Array<{ baseItemId: string; qty: number }> = []
    for (const line of lines) {
      const qty = Math.floor(line.quantity)
      if (qty <= 0) continue
      if (!isRarityDealerBaseItem(line.itemId)) {
        return new Response(JSON.stringify({ error: `Item not sold as rolled gear: ${line.itemId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const price = prices.get(line.itemId)
      if (price == null) {
        return new Response(JSON.stringify({ error: `Item not in shop stock: ${line.itemId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      totalCost += price * qty
      rolls.push({ baseItemId: line.itemId, qty })
    }

    if (totalCost <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid purchase' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      const char = await tx.character.findFirst({
        where: { id: body.characterId, userId: user.id },
      })
      if (!char) throw new Error('Character not found')
      if (char.zeny < totalCost) throw new Error('Not enough zeny')

      const progress = await tx.characterProgress.findUnique({
        where: { characterId: body.characterId },
      })
      if (!progress) throw new Error('Progress not found')

      const jobId = progress.jobId
      const rolledItems =
        progress.rolledItems && typeof progress.rolledItems === 'object'
          ? { ...(progress.rolledItems as Record<string, unknown>) }
          : {}
      let sessionSlots = parseSessionInventory(progress.sessionInventory)
      const created: unknown[] = []

      for (const { baseItemId, qty } of rolls) {
        const base = ITEMS_BY_ID[baseItemId]
        if (!base?.rarity) throw new Error(`Item missing rarity: ${baseItemId}`)
        for (let i = 0; i < qty; i++) {
          const rolled = createServerRolledGear(baseItemId, {
            rarity: base.rarity,
            requiredBaseLevel: base.requiredBaseLevel ?? 1,
            jobId,
          })
          if (!rolled) throw new Error(`Could not roll ${baseItemId}`)
          rolledItems[rolled.id] = rolled
          sessionSlots = addUniqueItems(sessionSlots, [rolled.id])
          created.push(rolled)
        }
      }

      const nextZeny = char.zeny - totalCost
      await tx.character.update({
        where: { id: body.characterId },
        data: { zeny: nextZeny },
      })
      await tx.characterProgress.update({
        where: { characterId: body.characterId },
        data: {
          sessionInventory: sessionSlots,
          rolledItems,
        },
      })

      return { zeny: nextZeny, rolled: created, sessionInventory: sessionSlots, rolledItems }
    })

    await writeAuditLog(service, body.characterId, 'rarity_shop_buy', {
      npcId: body.npcId,
      totalCost,
      lines: rolls,
      itemIds: result.rolled.map((r: { id: string }) => r.id),
    })

    return new Response(
      JSON.stringify({
        ok: true,
        zeny: result.zeny,
        rolledItems: result.rolled,
        sessionInventory: result.sessionInventory,
        rolledItemsRecord: result.rolledItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes('zeny') ? 400 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
