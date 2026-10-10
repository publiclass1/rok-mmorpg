// @ts-nocheck
import { corsHeaders } from '../shared/cors.js'
import {
  addToSession,
  assertSameMapAndRange,
  parseSessionInventory,
  removeFromSession,
} from '../shared/social.js'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../shared/supabase.js'

type ListingInput = { itemId: string; price: number; quantity: number }

type Action = 'open' | 'close' | 'set_listings' | 'buy' | 'update_pos'

type Body = {
  action: Action
  characterId: string
  sellerCharacterId?: string
  title?: string
  mapId?: string
  x?: number
  y?: number
  listings?: ListingInput[]
  listingId?: string
  quantity?: number
}

async function returnListingsToSession(
  service: ReturnType<typeof createServiceClient>,
  characterId: string,
) {
  const { data: listings } = await service
    .from('vendor_listings')
    .select('*')
    .eq('character_id', characterId)

  if (!listings?.length) return

  const { data: progress } = await service
    .from('character_progress')
    .select('session_inventory')
    .eq('character_id', characterId)
    .maybeSingle()

  let slots = parseSessionInventory(progress?.session_inventory)
  for (const row of listings) {
    slots = addToSession(slots, row.item_id, row.quantity)
  }

  await service
    .from('character_progress')
    .update({ session_inventory: slots, updated_at: new Date().toISOString() })
    .eq('character_id', characterId)

  await service.from('vendor_listings').delete().eq('character_id', characterId)
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

    await getOwnedCharacter(client, user.id, body.characterId)

    if (body.action === 'open') {
      const title = (body.title ?? 'Shop').trim().slice(0, 40) || 'Shop'
      if (!body.mapId) {
        return new Response(JSON.stringify({ error: 'mapId required' }), { status: 400 })
      }
      const { data, error } = await service
        .from('vendor_stalls')
        .upsert({
          character_id: body.characterId,
          title,
          map_id: body.mapId,
          x: body.x ?? 0,
          y: body.y ?? 0,
          is_open: true,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ stall: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'update_pos') {
      if (!body.mapId) {
        return new Response(JSON.stringify({ error: 'mapId required' }), { status: 400 })
      }
      await service
        .from('vendor_stalls')
        .update({
          map_id: body.mapId,
          x: body.x ?? 0,
          y: body.y ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('character_id', body.characterId)
        .eq('is_open', true)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'close') {
      await returnListingsToSession(service, body.characterId)
      await service
        .from('vendor_stalls')
        .update({ is_open: false, updated_at: new Date().toISOString() })
        .eq('character_id', body.characterId)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'set_listings') {
      const listings = body.listings ?? []
      for (const row of listings) {
        if (!row.itemId || row.price <= 0 || row.quantity <= 0) {
          return new Response(JSON.stringify({ error: 'Invalid listing row' }), { status: 400 })
        }
      }

      await returnListingsToSession(service, body.characterId)

      const { data: progress } = await service
        .from('character_progress')
        .select('session_inventory')
        .eq('character_id', body.characterId)
        .maybeSingle()

      let slots = parseSessionInventory(progress?.session_inventory)
      for (const row of listings) {
        try {
          slots = removeFromSession(slots, row.itemId, row.quantity)
        } catch {
          return new Response(JSON.stringify({ error: `Not enough ${row.itemId}` }), { status: 400 })
        }
      }

      await service
        .from('character_progress')
        .update({ session_inventory: slots, updated_at: new Date().toISOString() })
        .eq('character_id', body.characterId)

      if (listings.length > 0) {
        const { error } = await service.from('vendor_listings').insert(
          listings.map((row) => ({
            character_id: body.characterId,
            item_id: row.itemId,
            price: Math.floor(row.price),
            quantity: Math.floor(row.quantity),
          })),
        )
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400 })
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'buy') {
      if (!body.sellerCharacterId || !body.listingId) {
        return new Response(JSON.stringify({ error: 'sellerCharacterId and listingId required' }), {
          status: 400,
        })
      }
      const qty = Math.floor(body.quantity ?? 1)
      if (qty <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid quantity' }), { status: 400 })
      }

      await assertSameMapAndRange(service, body.characterId, body.sellerCharacterId)

      const { data: stall } = await service
        .from('vendor_stalls')
        .select('*')
        .eq('character_id', body.sellerCharacterId)
        .eq('is_open', true)
        .maybeSingle()

      if (!stall) {
        return new Response(JSON.stringify({ error: 'Stall is closed' }), { status: 400 })
      }

      const { data: listing } = await service
        .from('vendor_listings')
        .select('*')
        .eq('id', body.listingId)
        .eq('character_id', body.sellerCharacterId)
        .maybeSingle()

      if (!listing || listing.quantity < qty) {
        return new Response(JSON.stringify({ error: 'Not enough stock' }), { status: 400 })
      }

      const totalCost = listing.price * qty
      const { data: buyer } = await service
        .from('characters')
        .select('zeny')
        .eq('id', body.characterId)
        .single()
      if (!buyer || buyer.zeny < totalCost) {
        return new Response(JSON.stringify({ error: 'Not enough zeny' }), { status: 400 })
      }

      const { data: seller } = await service
        .from('characters')
        .select('zeny')
        .eq('id', body.sellerCharacterId)
        .single()

      const { data: buyerProgress } = await service
        .from('character_progress')
        .select('session_inventory')
        .eq('character_id', body.characterId)
        .maybeSingle()

      let buyerSlots = parseSessionInventory(buyerProgress?.session_inventory)
      buyerSlots = addToSession(buyerSlots, listing.item_id, qty)

      await service
        .from('character_progress')
        .update({ session_inventory: buyerSlots, updated_at: new Date().toISOString() })
        .eq('character_id', body.characterId)

      await service
        .from('characters')
        .update({ zeny: buyer.zeny - totalCost })
        .eq('id', body.characterId)

      await service
        .from('characters')
        .update({ zeny: (seller?.zeny ?? 0) + totalCost })
        .eq('id', body.sellerCharacterId)

      const left = listing.quantity - qty
      if (left <= 0) {
        await service.from('vendor_listings').delete().eq('id', listing.id)
      } else {
        await service.from('vendor_listings').update({ quantity: left }).eq('id', listing.id)
      }

      return new Response(JSON.stringify({ ok: true, zenySpent: totalCost }), {
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
}