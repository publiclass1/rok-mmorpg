// @ts-nocheck
import { corsHeaders } from '../shared/cors.js'
import { writeAuditLog } from '../shared/auditLog.js'
import { resolveNpcSellUnitPrice } from '../shared/npcSellPrice.js'
import { parseSessionInventory, removeFromSession } from '../shared/social.js'
import {
  assertNearNpc,
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../shared/supabase.js'
import { prisma } from '../lib/prisma.js'

type SellLine = { itemId: string; quantity: number }

type Body = {
  characterId: string
  npcId: string
  lines: SellLine[]
}

const ROLLED_PREFIX = 'ri:'

function rolledRarityFromRecord(
  rolledItems: Record<string, unknown>,
  itemId: string,
): string | null {
  const row = rolledItems[itemId]
  if (!row || typeof row !== 'object') return null
  const rarity = (row as { rarity?: unknown }).rarity
  return typeof rarity === 'string' ? rarity : null
}

async function removeDbInventory(
  tx: typeof prisma,
  characterId: string,
  itemId: string,
  qty: number,
) {
  const row = await tx.characterInventory.findFirst({
    where: { characterId, itemId },
  })
  if (!row || row.quantity < qty) throw new Error('Not enough items in inventory')
  if (row.quantity === qty) {
    await tx.characterInventory.delete({ where: { id: row.id } })
  } else {
    await tx.characterInventory.update({
      where: { id: row.id },
      data: { quantity: row.quantity - qty },
    })
  }
}

function countInSession(slots: ReturnType<typeof parseSessionInventory>, itemId: string): number {
  return slots.filter((s) => s.itemId === itemId).reduce((sum, s) => sum + s.quantity, 0)
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

    const npcRow = await assertNearNpc(
      service,
      character.map_id,
      character.x,
      character.y,
      body.npcId,
    )
    if (npcRow.npc_type !== 'shop') {
      return new Response(JSON.stringify({ error: 'Not a shop NPC' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lines = Array.isArray(body.lines) ? body.lines : []
    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: 'No items to sell' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      const char = await tx.character.findFirst({
        where: { id: body.characterId, userId: user.id },
      })
      if (!char) throw new Error('Character not found')

      const progress = await tx.characterProgress.findUnique({
        where: { characterId: body.characterId },
      })
      if (!progress) throw new Error('Progress not found')

      const rolledItems =
        progress.rolledItems && typeof progress.rolledItems === 'object'
          ? { ...(progress.rolledItems as Record<string, unknown>) }
          : {}

      let sessionSlots = parseSessionInventory(progress.sessionInventory)
      let totalCredit = 0
      const auditedLines: SellLine[] = []

      for (const line of lines) {
        const itemId = line.itemId
        const qty = Math.floor(line.quantity)
        if (!itemId || qty <= 0) continue

        const unit = resolveNpcSellUnitPrice(
          itemId,
          itemId.startsWith(ROLLED_PREFIX) ? rolledRarityFromRecord(rolledItems, itemId) : null,
        )
        if (unit <= 0) throw new Error(`Cannot sell item: ${itemId}`)

        const inSession = countInSession(sessionSlots, itemId)
        const dbRow = await tx.characterInventory.findFirst({
          where: { characterId: body.characterId, itemId },
        })
        const inDb = dbRow?.quantity ?? 0
        if (inSession + inDb < qty) throw new Error('Not enough items to sell')

        let remaining = qty
        const fromSession = Math.min(remaining, inSession)
        if (fromSession > 0) {
          sessionSlots = removeFromSession(sessionSlots, itemId, fromSession)
          remaining -= fromSession
        }
        if (remaining > 0) {
          await removeDbInventory(tx, body.characterId, itemId, remaining)
        }

        if (itemId.startsWith(ROLLED_PREFIX)) {
          delete rolledItems[itemId]
        }

        totalCredit += unit * qty
        auditedLines.push({ itemId, quantity: qty })
      }

      if (totalCredit <= 0 || auditedLines.length === 0) {
        throw new Error('Invalid sell')
      }

      const nextZeny = char.zeny + totalCredit
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

      return { zeny: nextZeny, sessionInventory: sessionSlots, rolledItems, totalCredit, auditedLines }
    })

    await writeAuditLog(service, body.characterId, 'npc_shop_sell', {
      npcId: body.npcId,
      totalCredit: result.totalCredit,
      lines: result.auditedLines,
    })

    return new Response(
      JSON.stringify({
        ok: true,
        zeny: result.zeny,
        sessionInventory: result.sessionInventory,
        rolledItemsRecord: result.rolledItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : String(err)
    const status =
      message.includes('Not enough') || message.includes('Cannot sell') || message.includes('Invalid')
        ? 400
        : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
