import { corsHeaders } from '../_shared/cors.ts'
import {
  assertSameMapAndRange,
  MAX_PARTY_SIZE,
} from '../_shared/social.ts'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

type Action =
  | 'invite'
  | 'apply'
  | 'accept'
  | 'decline'
  | 'leave'
  | 'kick'
  | 'disband'
  | 'set_exp_share'

type Body = {
  action: Action
  characterId: string
  targetCharacterId?: string
  requestId?: string
  expShare?: boolean
}

async function getMembership(service: ReturnType<typeof createServiceClient>, characterId: string) {
  const { data } = await service
    .from('party_members')
    .select('party_id, character_id')
    .eq('character_id', characterId)
    .maybeSingle()
  return data
}

async function getParty(service: ReturnType<typeof createServiceClient>, partyId: string) {
  const { data } = await service.from('parties').select('*').eq('id', partyId).maybeSingle()
  return data
}

async function memberCount(service: ReturnType<typeof createServiceClient>, partyId: string) {
  const { count } = await service
    .from('party_members')
    .select('*', { count: 'exact', head: true })
    .eq('party_id', partyId)
  return count ?? 0
}

async function ensurePartyForLeader(
  service: ReturnType<typeof createServiceClient>,
  leaderId: string,
) {
  const existing = await getMembership(service, leaderId)
  if (existing) {
    const party = await getParty(service, existing.party_id)
    if (party?.leader_character_id === leaderId) return party
    throw new Response(JSON.stringify({ error: 'Only party leader can invite' }), { status: 400 })
  }

  const { data: party, error } = await service
    .from('parties')
    .insert({ leader_character_id: leaderId })
    .select('*')
    .single()
  if (error || !party) {
    throw new Response(JSON.stringify({ error: error?.message ?? 'Could not create party' }), {
      status: 400,
    })
  }
  await service.from('party_members').insert({ party_id: party.id, character_id: leaderId })
  return party
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

    if (body.action === 'invite') {
      if (!body.targetCharacterId) {
        return new Response(JSON.stringify({ error: 'targetCharacterId required' }), { status: 400 })
      }
      await assertSameMapAndRange(service, body.characterId, body.targetCharacterId)

      const targetMember = await getMembership(service, body.targetCharacterId)
      if (targetMember) {
        return new Response(JSON.stringify({ error: 'Target is already in a party' }), { status: 400 })
      }

      const party = await ensurePartyForLeader(service, body.characterId)
      const count = await memberCount(service, party.id)
      if (count >= MAX_PARTY_SIZE) {
        return new Response(JSON.stringify({ error: 'Party is full' }), { status: 400 })
      }

      await service
        .from('party_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('from_character_id', body.characterId)
        .eq('to_character_id', body.targetCharacterId)
        .eq('status', 'pending')

      const { data, error } = await service
        .from('party_requests')
        .insert({
          party_id: party.id,
          from_character_id: body.characterId,
          to_character_id: body.targetCharacterId,
          kind: 'invite',
        })
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ request: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'apply') {
      if (!body.targetCharacterId) {
        return new Response(JSON.stringify({ error: 'targetCharacterId required' }), { status: 400 })
      }
      await assertSameMapAndRange(service, body.characterId, body.targetCharacterId)

      const myMember = await getMembership(service, body.characterId)
      if (myMember) {
        return new Response(JSON.stringify({ error: 'Already in a party' }), { status: 400 })
      }

      const targetMember = await getMembership(service, body.targetCharacterId)
      if (!targetMember) {
        return new Response(JSON.stringify({ error: 'Target is not in a party' }), { status: 400 })
      }

      const party = await getParty(service, targetMember.party_id)
      if (!party) {
        return new Response(JSON.stringify({ error: 'Party not found' }), { status: 404 })
      }

      const leaderId = party.leader_character_id
      const count = await memberCount(service, party.id)
      if (count >= MAX_PARTY_SIZE) {
        return new Response(JSON.stringify({ error: 'Party is full' }), { status: 400 })
      }

      const { data, error } = await service
        .from('party_requests')
        .insert({
          party_id: party.id,
          from_character_id: body.characterId,
          to_character_id: leaderId,
          kind: 'apply',
        })
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ request: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'accept' || body.action === 'decline') {
      if (!body.requestId) {
        return new Response(JSON.stringify({ error: 'requestId required' }), { status: 400 })
      }

      const { data: request } = await service
        .from('party_requests')
        .select('*')
        .eq('id', body.requestId)
        .maybeSingle()

      if (!request || request.status !== 'pending') {
        return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404 })
      }

      if (request.kind === 'invite' && request.to_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Not your invite' }), { status: 403 })
      }
      if (request.kind === 'apply') {
        const party = await getParty(service, request.party_id)
        if (!party || party.leader_character_id !== body.characterId) {
          return new Response(JSON.stringify({ error: 'Only leader can respond to apply' }), {
            status: 403,
          })
        }
      }

      if (body.action === 'decline') {
        await service
          .from('party_requests')
          .update({ status: 'declined', updated_at: new Date().toISOString() })
          .eq('id', request.id)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const joinCharId =
        request.kind === 'invite' ? request.to_character_id : request.from_character_id
      const existing = await getMembership(service, joinCharId)
      if (existing) {
        return new Response(JSON.stringify({ error: 'Already in a party' }), { status: 400 })
      }

      const count = await memberCount(service, request.party_id)
      if (count >= MAX_PARTY_SIZE) {
        return new Response(JSON.stringify({ error: 'Party is full' }), { status: 400 })
      }

      await service.from('party_members').insert({
        party_id: request.party_id,
        character_id: joinCharId,
      })

      await service
        .from('party_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', request.id)

      return new Response(JSON.stringify({ ok: true, partyId: request.party_id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'leave') {
      const member = await getMembership(service, body.characterId)
      if (!member) {
        return new Response(JSON.stringify({ error: 'Not in a party' }), { status: 400 })
      }

      const party = await getParty(service, member.party_id)
      await service.from('party_members').delete().eq('character_id', body.characterId)

      const remaining = await memberCount(service, member.party_id)
      if (remaining === 0) {
        await service.from('parties').delete().eq('id', member.party_id)
      } else if (party?.leader_character_id === body.characterId) {
        const { data: others } = await service
          .from('party_members')
          .select('character_id')
          .eq('party_id', member.party_id)
          .limit(1)
        const newLeader = others?.[0]?.character_id
        if (newLeader) {
          await service
            .from('parties')
            .update({ leader_character_id: newLeader, updated_at: new Date().toISOString() })
            .eq('id', member.party_id)
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'kick') {
      if (!body.targetCharacterId) {
        return new Response(JSON.stringify({ error: 'targetCharacterId required' }), { status: 400 })
      }
      const member = await getMembership(service, body.characterId)
      const party = member ? await getParty(service, member.party_id) : null
      if (!party || party.leader_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Only leader can kick' }), { status: 403 })
      }
      if (body.targetCharacterId === body.characterId) {
        return new Response(JSON.stringify({ error: 'Cannot kick yourself' }), { status: 400 })
      }
      await service.from('party_members').delete().eq('character_id', body.targetCharacterId)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'disband') {
      const member = await getMembership(service, body.characterId)
      const party = member ? await getParty(service, member.party_id) : null
      if (!party || party.leader_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Only leader can disband' }), { status: 403 })
      }
      await service.from('party_members').delete().eq('party_id', party.id)
      await service.from('parties').delete().eq('id', party.id)
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'set_exp_share') {
      const member = await getMembership(service, body.characterId)
      const party = member ? await getParty(service, member.party_id) : null
      if (!party || party.leader_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Only leader can set EXP share' }), { status: 403 })
      }
      const { data, error } = await service
        .from('parties')
        .update({
          exp_share: Boolean(body.expShare),
          updated_at: new Date().toISOString(),
        })
        .eq('id', party.id)
        .select('*')
        .single()
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ party: data }), {
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
