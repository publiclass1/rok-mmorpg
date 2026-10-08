import { corsHeaders } from '../_shared/cors.ts'
import {
  assertNearNpc,
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

type Body = {
  characterId: string
  direction: 'to_storage' | 'to_character'
  itemId: string
  quantity: number
  mapId: string
  x: number
  y: number
  npcId: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body
    const qty = Math.floor(body.quantity)

    if (!body.characterId || !body.itemId || qty <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const service = createServiceClient()
    const character = await getOwnedCharacter(client, user.id, body.characterId)
    await assertNearNpc(service, character.map_id, character.x, character.y, body.npcId)

    if (body.direction === 'to_storage') {
      const { data: inv } = await service
        .from('character_inventory')
        .select('*')
        .eq('character_id', character.id)
        .eq('item_id', body.itemId)
        .maybeSingle()

      if (!inv || inv.quantity < qty) {
        return new Response(JSON.stringify({ error: 'Not enough items on character' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const newCharQty = inv.quantity - qty
      if (newCharQty === 0) {
        await service.from('character_inventory').delete().eq('id', inv.id)
      } else {
        await service.from('character_inventory').update({ quantity: newCharQty }).eq('id', inv.id)
      }

      const { data: storage } = await service
        .from('account_storage')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', body.itemId)
        .maybeSingle()

      if (storage) {
        await service
          .from('account_storage')
          .update({ quantity: storage.quantity + qty })
          .eq('id', storage.id)
      } else {
        await service.from('account_storage').insert({
          user_id: user.id,
          item_id: body.itemId,
          quantity: qty,
        })
      }
    } else {
      const { data: storage } = await service
        .from('account_storage')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', body.itemId)
        .maybeSingle()

      if (!storage || storage.quantity < qty) {
        return new Response(JSON.stringify({ error: 'Not enough items in storage' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const newStorageQty = storage.quantity - qty
      if (newStorageQty === 0) {
        await service.from('account_storage').delete().eq('id', storage.id)
      } else {
        await service.from('account_storage').update({ quantity: newStorageQty }).eq('id', storage.id)
      }

      const { data: inv } = await service
        .from('character_inventory')
        .select('*')
        .eq('character_id', character.id)
        .eq('item_id', body.itemId)
        .maybeSingle()

      if (inv) {
        await service
          .from('character_inventory')
          .update({ quantity: inv.quantity + qty })
          .eq('id', inv.id)
      } else {
        await service.from('character_inventory').insert({
          character_id: character.id,
          item_id: body.itemId,
          quantity: qty,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
