import { adminPasswordFromRequest, assertAdminPassword } from '../_shared/adminAuth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

const ONLINE_WINDOW_SECONDS = 45
const MAX_ZENY_GRANT = 1_000_000_000

type Action = 'stats' | 'search_characters' | 'set_gm' | 'unset_gm' | 'grant_zeny'

type Body = {
  action: Action
  adminPassword?: string
  q?: string
  gmOnly?: boolean
  characterId?: string
  name?: string
  amount?: number
}

function escapeIlikePattern(q: string): string {
  return q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

async function resolveCharacterId(
  service: ReturnType<typeof createServiceClient>,
  characterId?: string,
  name?: string,
): Promise<string> {
  if (characterId) return characterId
  const trimmed = (name ?? '').trim()
  if (!trimmed) {
    throw new Response(JSON.stringify({ error: 'characterId or name required' }), { status: 400 })
  }
  const { data } = await service.from('characters').select('id').eq('name', trimmed).maybeSingle()
  if (!data) {
    throw new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 })
  }
  return data.id
}

function parseGrantAmount(raw: number | undefined): number {
  const amount = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Response(JSON.stringify({ error: 'Amount must be a positive integer' }), { status: 400 })
  }
  if (amount > MAX_ZENY_GRANT) {
    throw new Response(JSON.stringify({ error: `Amount cannot exceed ${MAX_ZENY_GRANT}` }), {
      status: 400,
    })
  }
  return amount
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as Body
    assertAdminPassword(adminPasswordFromRequest(req, body))
    const service = createServiceClient()

    if (body.action === 'stats') {
      const cutoff = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString()

      const [charCount, partyCount, guildCount, vendorStallCount, zenyAgg, accountRows] =
        await Promise.all([
          service.from('characters').select('*', { count: 'exact', head: true }),
          service.from('parties').select('*', { count: 'exact', head: true }),
          service.from('guilds').select('*', { count: 'exact', head: true }),
          service.from('vendor_stalls').select('*', { count: 'exact', head: true }),
          service.from('characters').select('zeny'),
          service.from('characters').select('user_id'),
        ])

      let presenceRows: { map_id: string; character_id: string }[] = []
      const presenceResult = await service
        .from('character_presence')
        .select('map_id, character_id')
        .gte('last_seen', cutoff)
      if (!presenceResult.error) {
        presenceRows = (presenceResult.data ?? []) as { map_id: string; character_id: string }[]
      }

      const zenyValues = (zenyAgg.data ?? []).map((r) => (r as { zeny: number }).zeny)
      const totalZeny = zenyValues.reduce((s, z) => s + z, 0)
      const distinctAccounts = new Set(
        (accountRows.data ?? []).map((r) => (r as { user_id: string }).user_id),
      )

      const byMap = new Map<string, number>()
      for (const row of presenceRows) {
        byMap.set(row.map_id, (byMap.get(row.map_id) ?? 0) + 1)
      }
      const onlinePerMap = [...byMap.entries()]
        .map(([mapId, count]) => ({ mapId, count }))
        .sort((a, b) => b.count - a.count)

      return new Response(
        JSON.stringify({
          totalCharacters: charCount.count ?? 0,
          totalAccounts: distinctAccounts.size,
          totalParties: partyCount.count ?? 0,
          totalGuilds: guildCount.count ?? 0,
          totalVendorStalls: vendorStallCount.count ?? 0,
          totalZeny,
          averageZeny: zenyValues.length > 0 ? Math.round(totalZeny / zenyValues.length) : 0,
          totalOnline: presenceRows.length,
          onlinePerMap,
          onlineWindowSeconds: ONLINE_WINDOW_SECONDS,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.action === 'search_characters') {
      const q = (body.q ?? '').trim()
      let query = service
        .from('characters')
        .select('id, name, map_id, zeny, is_gm')
        .order('name')
        .limit(50)
      if (q) {
        query = query.ilike('name', `%${escapeIlikePattern(q)}%`)
      }
      if (body.gmOnly) {
        query = query.eq('is_gm', true)
      }
      const { data, error } = await query
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ characters: data ?? [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'set_gm' || body.action === 'unset_gm') {
      const id = await resolveCharacterId(service, body.characterId, body.name)
      const isGm = body.action === 'set_gm'
      const { data, error } = await service
        .from('characters')
        .update({ is_gm: isGm })
        .eq('id', id)
        .select('id, name, map_id, zeny, is_gm')
        .single()
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ character: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'grant_zeny') {
      const amount = parseGrantAmount(body.amount)
      const id = await resolveCharacterId(service, body.characterId, body.name)
      const { data: target, error: targetErr } = await service
        .from('characters')
        .select('id, name, zeny')
        .eq('id', id)
        .maybeSingle()

      if (targetErr || !target) {
        return new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 })
      }

      const newZeny = target.zeny + amount
      const { error: updateErr } = await service.from('characters').update({ zeny: newZeny }).eq('id', id)
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), { status: 400 })
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Granted ${amount.toLocaleString()} zeny to ${target.name}.`,
          character: { id: target.id, name: target.name, zeny: newZeny },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
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
