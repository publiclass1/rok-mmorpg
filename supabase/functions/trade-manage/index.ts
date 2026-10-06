import { corsHeaders } from '../_shared/cors.ts'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

const TRADE_RANGE = 120

type Action =
  | 'request'
  | 'accept'
  | 'add_item'
  | 'add_zeny'
  | 'lock'
  | 'confirm'
  | 'cancel'

type Body = {
  action: Action
  characterId: string
  partnerCharacterId?: string
  tradeSessionId?: string
  itemId?: string
  quantity?: number
  zeny?: number
  mapId?: string
  x?: number
  y?: number
}

async function assertParticipant(
  service: ReturnType<typeof createServiceClient>,
  tradeId: string,
  characterId: string,
) {
  const { data: trade, error } = await service
    .from('trade_sessions')
    .select('*')
    .eq('id', tradeId)
    .maybeSingle()

  if (error || !trade) {
    throw new Response(JSON.stringify({ error: 'Trade not found' }), { status: 404 })
  }
  if (trade.initiator_character_id !== characterId && trade.partner_character_id !== characterId) {
    throw new Response(JSON.stringify({ error: 'Not a trade participant' }), { status: 403 })
  }
  return trade
}

async function assertSameMapAndRange(
  service: ReturnType<typeof createServiceClient>,
  aId: string,
  bId: string,
) {
  const { data: chars, error } = await service
    .from('characters')
    .select('id, map_id, x, y')
    .in('id', [aId, bId])

  if (error || !chars || chars.length !== 2) {
    throw new Response(JSON.stringify({ error: 'Characters not found' }), { status: 404 })
  }

  const a = chars.find((c) => c.id === aId)!
  const b = chars.find((c) => c.id === bId)!

  if (a.map_id !== b.map_id) {
    throw new Response(JSON.stringify({ error: 'Must be on the same map to trade' }), {
      status: 400,
    })
  }

  const dx = a.x - b.x
  const dy = a.y - b.y
  if (Math.sqrt(dx * dx + dy * dy) > TRADE_RANGE) {
    throw new Response(JSON.stringify({ error: 'Too far to trade' }), { status: 400 })
  }
}

async function executeTrade(
  service: ReturnType<typeof createServiceClient>,
  tradeId: string,
) {
  const { data: trade } = await service.from('trade_sessions').select('*').eq('id', tradeId).single()
  const { data: offers } = await service.from('trade_offers').select('*').eq('trade_session_id', tradeId)

  if (!trade || !offers) return

  const byChar = new Map<string, typeof offers>()
  for (const offer of offers) {
    const list = byChar.get(offer.character_id) ?? []
    list.push(offer)
    byChar.set(offer.character_id, list)
  }

  const initiatorOffers = byChar.get(trade.initiator_character_id) ?? []
  const partnerOffers = byChar.get(trade.partner_character_id) ?? []

  for (const side of [
    { charId: trade.initiator_character_id, offers: initiatorOffers, receiveFrom: partnerOffers },
    { charId: trade.partner_character_id, offers: partnerOffers, receiveFrom: initiatorOffers },
  ]) {
    const { data: char } = await service.from('characters').select('*').eq('id', side.charId).single()
    if (!char) throw new Error('Character missing')

    let zenyOut = 0
    let zenyIn = 0
    for (const o of side.offers) zenyOut += o.zeny ?? 0
    for (const o of side.receiveFrom) zenyIn += o.zeny ?? 0

    if (char.zeny + zenyIn < zenyOut) {
      throw new Response(JSON.stringify({ error: 'Insufficient zeny' }), { status: 400 })
    }

    for (const o of side.offers) {
      if (o.item_id && o.quantity > 0) {
        const { data: inv } = await service
          .from('character_inventory')
          .select('*')
          .eq('character_id', side.charId)
          .eq('item_id', o.item_id)
          .maybeSingle()
        if (!inv || inv.quantity < o.quantity) {
          throw new Response(JSON.stringify({ error: 'Insufficient items' }), { status: 400 })
        }
      }
    }
  }

  for (const offer of offers) {
    if (offer.quantity > 0 && offer.item_id) {
      const { data: inv } = await service
        .from('character_inventory')
        .select('*')
        .eq('character_id', offer.character_id)
        .eq('item_id', offer.item_id)
        .maybeSingle()

      if (!inv) continue
      const left = inv.quantity - offer.quantity
      if (left <= 0) {
        await service.from('character_inventory').delete().eq('id', inv.id)
      } else {
        await service.from('character_inventory').update({ quantity: left }).eq('id', inv.id)
      }
    }
  }

  for (const offer of offers) {
    const receiverId =
      offer.character_id === trade.initiator_character_id
        ? trade.partner_character_id
        : trade.initiator_character_id

    if (offer.quantity > 0 && offer.item_id) {
      const { data: inv } = await service
        .from('character_inventory')
        .select('*')
        .eq('character_id', receiverId)
        .eq('item_id', offer.item_id)
        .maybeSingle()

      if (inv) {
        await service
          .from('character_inventory')
          .update({ quantity: inv.quantity + offer.quantity })
          .eq('id', inv.id)
      } else {
        await service.from('character_inventory').insert({
          character_id: receiverId,
          item_id: offer.item_id,
          quantity: offer.quantity,
        })
      }
    }
  }

  const initZenyOut = initiatorOffers.reduce((s, o) => s + (o.zeny ?? 0), 0)
  const initZenyIn = partnerOffers.reduce((s, o) => s + (o.zeny ?? 0), 0)
  const partZenyOut = partnerOffers.reduce((s, o) => s + (o.zeny ?? 0), 0)
  const partZenyIn = initiatorOffers.reduce((s, o) => s + (o.zeny ?? 0), 0)

  const { data: initiator } = await service
    .from('characters')
    .select('zeny')
    .eq('id', trade.initiator_character_id)
    .single()
  const { data: partner } = await service
    .from('characters')
    .select('zeny')
    .eq('id', trade.partner_character_id)
    .single()

  await service
    .from('characters')
    .update({ zeny: (initiator?.zeny ?? 0) - initZenyOut + initZenyIn })
    .eq('id', trade.initiator_character_id)

  await service
    .from('characters')
    .update({ zeny: (partner?.zeny ?? 0) - partZenyOut + partZenyIn })
    .eq('id', trade.partner_character_id)

  await service
    .from('trade_sessions')
    .update({ state: 'completed', updated_at: new Date().toISOString() })
    .eq('id', tradeId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body
    const service = createServiceClient()

    await getOwnedCharacter(client, user.id, body.characterId)

    if (body.action === 'request') {
      if (!body.partnerCharacterId) {
        return new Response(JSON.stringify({ error: 'partnerCharacterId required' }), { status: 400 })
      }
      await assertSameMapAndRange(service, body.characterId, body.partnerCharacterId)

      const { data, error } = await service
        .from('trade_sessions')
        .insert({
          initiator_character_id: body.characterId,
          partner_character_id: body.partnerCharacterId,
          state: 'pending',
        })
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ trade: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!body.tradeSessionId) {
      return new Response(JSON.stringify({ error: 'tradeSessionId required' }), { status: 400 })
    }

    const trade = await assertParticipant(service, body.tradeSessionId, body.characterId)

    if (body.action === 'accept') {
      if (trade.state !== 'pending' || trade.partner_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Cannot accept trade' }), { status: 400 })
      }
      await assertSameMapAndRange(service, trade.initiator_character_id, trade.partner_character_id)
      const { data, error } = await service
        .from('trade_sessions')
        .update({ state: 'open', updated_at: new Date().toISOString() })
        .eq('id', trade.id)
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ trade: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'cancel') {
      if (!['pending', 'open', 'locked'].includes(trade.state)) {
        return new Response(JSON.stringify({ error: 'Trade already finished' }), { status: 400 })
      }
      await service
        .from('trade_sessions')
        .update({ state: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', trade.id)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (trade.state !== 'open' && body.action !== 'confirm') {
      return new Response(JSON.stringify({ error: 'Trade not open' }), { status: 400 })
    }

    if (body.action === 'add_item') {
      const qty = Math.floor(body.quantity ?? 0)
      if (!body.itemId || qty <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid item offer' }), { status: 400 })
      }
      const { data: inv } = await service
        .from('character_inventory')
        .select('*')
        .eq('character_id', body.characterId)
        .eq('item_id', body.itemId)
        .maybeSingle()
      if (!inv || inv.quantity < qty) {
        return new Response(JSON.stringify({ error: 'Not enough items' }), { status: 400 })
      }

      await service.from('trade_offers').delete().eq('trade_session_id', trade.id).eq('character_id', body.characterId).eq('item_id', body.itemId)

      const { error } = await service.from('trade_offers').insert({
        trade_session_id: trade.id,
        character_id: body.characterId,
        item_id: body.itemId,
        quantity: qty,
        zeny: 0,
      })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      await service.from('trade_sessions').update({ updated_at: new Date().toISOString() }).eq('id', trade.id)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'add_zeny') {
      const amount = Math.floor(body.zeny ?? 0)
      if (amount < 0) {
        return new Response(JSON.stringify({ error: 'Invalid zeny' }), { status: 400 })
      }
      const { data: char } = await service.from('characters').select('zeny').eq('id', body.characterId).single()
      if (!char || char.zeny < amount) {
        return new Response(JSON.stringify({ error: 'Not enough zeny' }), { status: 400 })
      }

      await service
        .from('trade_offers')
        .delete()
        .eq('trade_session_id', trade.id)
        .eq('character_id', body.characterId)
        .is('item_id', null)

      if (amount > 0) {
        await service.from('trade_offers').insert({
          trade_session_id: trade.id,
          character_id: body.characterId,
          item_id: null,
          quantity: 0,
          zeny: amount,
        })
      }

      await service.from('trade_sessions').update({ updated_at: new Date().toISOString() }).eq('id', trade.id)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'lock') {
      await service
        .from('trade_sessions')
        .update({
          state: 'locked',
          initiator_confirmed: false,
          partner_confirmed: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trade.id)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'confirm') {
      if (trade.state !== 'locked') {
        return new Response(JSON.stringify({ error: 'Trade must be locked first' }), { status: 400 })
      }

      const isInitiator = trade.initiator_character_id === body.characterId
      const patch = isInitiator
        ? { initiator_confirmed: true }
        : { partner_confirmed: true }

      const { data: updated, error } = await service
        .from('trade_sessions')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', trade.id)
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }

      if (updated.initiator_confirmed && updated.partner_confirmed) {
        await executeTrade(service, trade.id)
      }

      const { data: finalTrade } = await service.from('trade_sessions').select('*').eq('id', trade.id).single()

      return new Response(JSON.stringify({ trade: finalTrade }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
