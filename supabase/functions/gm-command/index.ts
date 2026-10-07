import { corsHeaders } from '../_shared/cors.ts'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

const MAX_ZENY_GRANT = 1_000_000_000

type Body = {
  characterId: string
  command: string
}

async function resolveCharacterIdByName(
  service: ReturnType<typeof createServiceClient>,
  name: string,
): Promise<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Response(JSON.stringify({ error: 'Character name required' }), { status: 400 })
  }
  const { data } = await service.from('characters').select('id').eq('name', trimmed).maybeSingle()
  if (!data) {
    throw new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 })
  }
  return data.id
}

function parseZenyCommand(command: string): { targetName: string; amount: number } {
  const trimmed = command.trim()
  const match = /^\/zeny\s+(.+)\s+(\d+)$/i.exec(trimmed)
  if (!match) {
    throw new Response(JSON.stringify({ error: 'Usage: /zeny <player> <amount>' }), { status: 400 })
  }
  const amount = Number.parseInt(match[2], 10)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Response(JSON.stringify({ error: 'Amount must be a positive integer' }), { status: 400 })
  }
  if (amount > MAX_ZENY_GRANT) {
    throw new Response(JSON.stringify({ error: `Amount cannot exceed ${MAX_ZENY_GRANT}` }), {
      status: 400,
    })
  }
  const targetName = match[1].trim()
  if (!targetName) {
    throw new Response(JSON.stringify({ error: 'Character name required' }), { status: 400 })
  }
  return { targetName, amount }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = createAuthedClient(req)
    const user = await requireUser(client)
    const body = (await req.json()) as Body
    if (!body.characterId || !body.command) {
      return new Response(JSON.stringify({ error: 'characterId and command required' }), { status: 400 })
    }

    await getOwnedCharacter(client, user.id, body.characterId)
    const service = createServiceClient()

    const { data: actor, error: actorErr } = await service
      .from('characters')
      .select('id, name, is_gm')
      .eq('id', body.characterId)
      .maybeSingle()

    if (actorErr) {
      return new Response(JSON.stringify({ error: actorErr.message }), { status: 400 })
    }
    if (!actor?.is_gm) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 })
    }

    const { targetName, amount } = parseZenyCommand(body.command)
    const targetId = await resolveCharacterIdByName(service, targetName)

    const { data: target, error: targetErr } = await service
      .from('characters')
      .select('id, name, zeny')
      .eq('id', targetId)
      .maybeSingle()

    if (targetErr || !target) {
      return new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 })
    }

    const newZeny = target.zeny + amount
    const { error: updateErr } = await service
      .from('characters')
      .update({ zeny: newZeny })
      .eq('id', targetId)

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 400 })
    }

    const message = `Granted ${amount.toLocaleString()} zeny to ${target.name}.`
    return new Response(
      JSON.stringify({
        ok: true,
        message,
        targetId: target.id,
        targetName: target.name,
        newZeny,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    if (err instanceof Response) return err
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
