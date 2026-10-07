import { corsHeaders } from '../_shared/cors.ts'
import { writeAuditLog } from '../_shared/auditLog.ts'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

type Body = {
  action: 'spend' | 'credit'
  characterId: string
  delta: number
  reason?: string
}

const MAX_SPEND_PER_CALL = 50_000_000
const MAX_CREDIT_PER_CALL = 5_000_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body
    const service = createServiceClient()

    const character = await getOwnedCharacter(client, user.id, body.characterId)
    const delta = Math.trunc(body.delta)
    if (!Number.isFinite(delta) || delta === 0) {
      return new Response(JSON.stringify({ error: 'Invalid delta' }), { status: 400 })
    }

    if (body.action === 'credit') {
      if (delta < 0) {
        return new Response(JSON.stringify({ error: 'Credit requires positive delta' }), { status: 400 })
      }
      if (delta > MAX_CREDIT_PER_CALL) {
        return new Response(JSON.stringify({ error: 'Amount too large' }), { status: 400 })
      }
      const next = character.zeny + delta
      const { data, error } = await service
        .from('characters')
        .update({ zeny: next })
        .eq('id', body.characterId)
        .select('zeny')
        .single()
      if (error || !data) {
        return new Response(JSON.stringify({ error: error?.message ?? 'Update failed' }), { status: 400 })
      }
      await writeAuditLog(service, body.characterId, 'zeny_credit', {
        delta,
        reason: body.reason ?? 'npc_shop_sell',
        newZeny: data.zeny,
      })
      return new Response(JSON.stringify({ ok: true, zeny: data.zeny }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'spend') {
      if (delta > 0) {
        return new Response(JSON.stringify({ error: 'Spend requires negative delta' }), { status: 400 })
      }
      if (-delta > MAX_SPEND_PER_CALL) {
        return new Response(JSON.stringify({ error: 'Amount too large' }), { status: 400 })
      }
      const next = character.zeny + delta
      if (next < 0) {
        return new Response(JSON.stringify({ error: 'Not enough zeny' }), { status: 400 })
      }
      const { data, error } = await service
        .from('characters')
        .update({ zeny: next })
        .eq('id', body.characterId)
        .select('zeny')
        .single()
      if (error || !data) {
        return new Response(JSON.stringify({ error: error?.message ?? 'Update failed' }), { status: 400 })
      }
      return new Response(JSON.stringify({ ok: true, zeny: data.zeny }), {
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
