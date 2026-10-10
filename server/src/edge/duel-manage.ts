// @ts-nocheck
import { corsHeaders } from '../shared/cors.js'
import { writeAuditLog } from '../shared/auditLog.js'
import { calcDuelStrike, derivedMaxHp, type DuelSnapshot } from '../shared/duelCombat.js'
import { assertSameMapAndRange } from '../shared/social.js'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../shared/supabase.js'

const EQUIP_SLOTS = [
  'weapon',
  'headTop',
  'headMiddle',
  'headLower',
  'armor',
  'garment',
  'boots',
  'offhand',
  'accLeft',
  'accRight',
] as const

type Action = 'invite' | 'accept' | 'decline' | 'cancel' | 'complete' | 'attack'

type Body = {
  action: Action
  characterId: string
  targetCharacterId?: string
  duelSessionId?: string
  winnerCharacterId?: string
  skillId?: string
  skillLevel?: number
}

type CombatSnapshot = {
  baseLevel: number
  jobId: string
  str: number
  agi: number
  vit: number
  int: number
  dex: number
  luk: number
  equipment: Record<string, string | null>
}

async function activeDuelForCharacter(
  service: ReturnType<typeof createServiceClient>,
  characterId: string,
) {
  const { data } = await service
    .from('duel_sessions')
    .select('id, state')
    .or(
      `challenger_character_id.eq.${characterId},opponent_character_id.eq.${characterId}`,
    )
    .in('state', ['pending', 'countdown', 'active'])
    .limit(1)
    .maybeSingle()
  return data
}

async function buildCombatSnapshot(
  service: ReturnType<typeof createServiceClient>,
  characterId: string,
): Promise<CombatSnapshot> {
  const { data: progress, error: progErr } = await service
    .from('character_progress')
    .select(
      'job_id, base_level, str, agi, vit, stat_int, dex, luk',
    )
    .eq('character_id', characterId)
    .maybeSingle()

  if (progErr || !progress) {
    throw new Response(JSON.stringify({ error: 'Character progress not found' }), { status: 404 })
  }

  const { data: rows } = await service
    .from('character_equipment')
    .select('slot, item_id')
    .eq('character_id', characterId)

  const equipment: Record<string, string | null> = {}
  for (const slot of EQUIP_SLOTS) {
    equipment[slot] = null
  }
  for (const row of rows ?? []) {
    if (row.slot && row.item_id) {
      equipment[row.slot] = row.item_id
    }
  }

  return {
    baseLevel: progress.base_level,
    jobId: progress.job_id,
    str: progress.str,
    agi: progress.agi,
    vit: progress.vit,
    int: progress.stat_int,
    dex: progress.dex,
    luk: progress.luk,
    equipment,
  }
}

function opponentIdFor(session: {
  challenger_character_id: string
  opponent_character_id: string
}, characterId: string): string {
  return session.challenger_character_id === characterId
    ? session.opponent_character_id
    : session.challenger_character_id
}

function snapshotForLocal(
  session: {
    challenger_character_id: string
    opponent_character_id: string
    challenger_snapshot: CombatSnapshot | null
    opponent_snapshot: CombatSnapshot | null
  },
  characterId: string,
): CombatSnapshot | null {
  if (session.challenger_character_id === characterId) {
    return session.opponent_snapshot as CombatSnapshot | null
  }
  return session.challenger_snapshot as CombatSnapshot | null
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

    if (body.action === 'invite') {
      if (!body.targetCharacterId) {
        return new Response(JSON.stringify({ error: 'targetCharacterId required' }), { status: 400 })
      }
      if (body.targetCharacterId === body.characterId) {
        return new Response(JSON.stringify({ error: 'Cannot duel yourself' }), { status: 400 })
      }

      await assertSameMapAndRange(service, body.characterId, body.targetCharacterId)

      const mine = await activeDuelForCharacter(service, body.characterId)
      if (mine) {
        return new Response(JSON.stringify({ error: 'Already in a duel' }), { status: 400 })
      }
      const theirs = await activeDuelForCharacter(service, body.targetCharacterId)
      if (theirs) {
        return new Response(JSON.stringify({ error: 'Target is already in a duel' }), { status: 400 })
      }

      const { data: challengerChar, error: charErr } = await service
        .from('characters')
        .select('id, name, map_id')
        .eq('id', body.characterId)
        .maybeSingle()
      if (charErr || !challengerChar) {
        return new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 })
      }

      const { data: progress } = await service
        .from('character_progress')
        .select('job_id, base_level')
        .eq('character_id', body.characterId)
        .maybeSingle()

      await service
        .from('duel_sessions')
        .update({ state: 'cancelled', updated_at: new Date().toISOString() })
        .eq('challenger_character_id', body.characterId)
        .eq('opponent_character_id', body.targetCharacterId)
        .eq('state', 'pending')

      const { data: duel, error } = await service
        .from('duel_sessions')
        .insert({
          challenger_character_id: body.characterId,
          opponent_character_id: body.targetCharacterId,
          state: 'pending',
          map_id: challengerChar.map_id,
          challenger_name: challengerChar.name,
          challenger_job_id: progress?.job_id ?? 'novice',
          challenger_base_level: progress?.base_level ?? 1,
        })
        .select('*')
        .single()

      if (error || !duel) {
        return new Response(JSON.stringify({ error: error?.message ?? 'Could not create duel invite' }), {
          status: 400,
        })
      }

      return new Response(JSON.stringify({ duel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'decline' || body.action === 'cancel') {
      if (!body.duelSessionId) {
        return new Response(JSON.stringify({ error: 'duelSessionId required' }), { status: 400 })
      }

      const { data: duel } = await service
        .from('duel_sessions')
        .select('*')
        .eq('id', body.duelSessionId)
        .maybeSingle()

      if (!duel || duel.state !== 'pending') {
        return new Response(JSON.stringify({ error: 'Duel invite not found' }), { status: 404 })
      }

      if (body.action === 'decline') {
        if (duel.opponent_character_id !== body.characterId) {
          return new Response(JSON.stringify({ error: 'Not your duel invite' }), { status: 403 })
        }
        await service
          .from('duel_sessions')
          .update({ state: 'declined', updated_at: new Date().toISOString() })
          .eq('id', duel.id)
      } else {
        if (duel.challenger_character_id !== body.characterId) {
          return new Response(JSON.stringify({ error: 'Only challenger can cancel' }), { status: 403 })
        }
        await service
          .from('duel_sessions')
          .update({ state: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', duel.id)
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'accept') {
      if (!body.duelSessionId) {
        return new Response(JSON.stringify({ error: 'duelSessionId required' }), { status: 400 })
      }

      const { data: duel } = await service
        .from('duel_sessions')
        .select('*')
        .eq('id', body.duelSessionId)
        .maybeSingle()

      if (!duel || duel.state !== 'pending') {
        return new Response(JSON.stringify({ error: 'Duel invite not found' }), { status: 404 })
      }
      if (duel.opponent_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Not your duel invite' }), { status: 403 })
      }

      await assertSameMapAndRange(service, duel.challenger_character_id, duel.opponent_character_id)

      const challengerSnapshot = await buildCombatSnapshot(service, duel.challenger_character_id)
      const opponentSnapshot = await buildCombatSnapshot(service, duel.opponent_character_id)
      const fightStartsAt = new Date(Date.now() + 5000).toISOString()
      const challengerHpMax = derivedMaxHp(
        challengerSnapshot.jobId,
        challengerSnapshot.baseLevel,
        challengerSnapshot.vit,
      )
      const opponentHpMax = derivedMaxHp(
        opponentSnapshot.jobId,
        opponentSnapshot.baseLevel,
        opponentSnapshot.vit,
      )

      const { data: updated, error } = await service
        .from('duel_sessions')
        .update({
          state: 'countdown',
          fight_starts_at: fightStartsAt,
          challenger_snapshot: challengerSnapshot,
          opponent_snapshot: opponentSnapshot,
          challenger_hp: challengerHpMax,
          opponent_hp: opponentHpMax,
          challenger_hp_max: challengerHpMax,
          opponent_hp_max: opponentHpMax,
          updated_at: new Date().toISOString(),
        })
        .eq('id', duel.id)
        .select('*')
        .single()

      if (error || !updated) {
        return new Response(JSON.stringify({ error: error?.message ?? 'Could not start duel' }), {
          status: 400,
        })
      }

      const opponentSnapshotForClient = snapshotForLocal(updated, body.characterId)

      return new Response(
        JSON.stringify({
          duel: updated,
          opponentCharacterId: opponentIdFor(updated, body.characterId),
          opponentSnapshot: opponentSnapshotForClient,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.action === 'attack') {
      if (!body.duelSessionId || !body.targetCharacterId) {
        return new Response(JSON.stringify({ error: 'duelSessionId and targetCharacterId required' }), {
          status: 400,
        })
      }

      const { data: duel } = await service
        .from('duel_sessions')
        .select('*')
        .eq('id', body.duelSessionId)
        .maybeSingle()

      if (!duel) {
        return new Response(JSON.stringify({ error: 'Duel not found' }), { status: 404 })
      }

      if (
        duel.challenger_character_id !== body.characterId &&
        duel.opponent_character_id !== body.characterId
      ) {
        return new Response(JSON.stringify({ error: 'Not a duel participant' }), { status: 403 })
      }

      const opponentId = opponentIdFor(duel, body.characterId)
      if (body.targetCharacterId !== opponentId) {
        return new Response(JSON.stringify({ error: 'Invalid duel target' }), { status: 400 })
      }

      if (!['countdown', 'active'].includes(duel.state)) {
        return new Response(JSON.stringify({ error: 'Duel is not active' }), { status: 400 })
      }

      const fightStart = duel.fight_starts_at ? Date.parse(duel.fight_starts_at) : 0
      if (!Number.isFinite(fightStart) || Date.now() < fightStart) {
        return new Response(JSON.stringify({ error: 'Fight has not started' }), { status: 400 })
      }

      const now = new Date()
      if (duel.last_attack_at) {
        const last = Date.parse(duel.last_attack_at)
        if (Number.isFinite(last) && now.getTime() - last < 400) {
          return new Response(JSON.stringify({ error: 'Attack on cooldown' }), { status: 429 })
        }
      }

      const attackerIsChallenger = duel.challenger_character_id === body.characterId
      const attackerSnapshot = (attackerIsChallenger
        ? duel.challenger_snapshot
        : duel.opponent_snapshot) as DuelSnapshot | null
      const defenderSnapshot = (attackerIsChallenger
        ? duel.opponent_snapshot
        : duel.challenger_snapshot) as DuelSnapshot | null

      if (!attackerSnapshot || !defenderSnapshot) {
        return new Response(JSON.stringify({ error: 'Duel snapshots missing' }), { status: 400 })
      }

      let challengerHp = duel.challenger_hp ?? duel.challenger_hp_max ?? 1
      let opponentHp = duel.opponent_hp ?? duel.opponent_hp_max ?? 1

      const strike = calcDuelStrike(
        attackerSnapshot,
        defenderSnapshot,
        () => Math.random(),
        body.skillId,
        body.skillLevel,
      )

      let targetHpAfter = attackerIsChallenger ? opponentHp : challengerHp
      if (strike.hit && strike.damage > 0) {
        targetHpAfter = Math.max(0, targetHpAfter - strike.damage)
      }

      if (attackerIsChallenger) opponentHp = targetHpAfter
      else challengerHp = targetHpAfter

      const nextState = targetHpAfter <= 0 ? 'completed' : (duel.state === 'countdown' ? 'active' : duel.state)
      const winnerId = targetHpAfter <= 0 ? body.characterId : null

      const { data: updated, error } = await service
        .from('duel_sessions')
        .update({
          state: nextState,
          challenger_hp: challengerHp,
          opponent_hp: opponentHp,
          winner_character_id: winnerId,
          last_attack_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', duel.id)
        .select('*')
        .single()

      if (error || !updated) {
        return new Response(JSON.stringify({ error: error?.message ?? 'Attack failed' }), { status: 400 })
      }

      if (winnerId) {
        await writeAuditLog(service, body.characterId, 'duel_won', { duelSessionId: duel.id })
      }

      return new Response(
        JSON.stringify({
          ok: true,
          hit: strike.hit,
          damage: strike.damage,
          critical: strike.critical,
          targetCharacterId: body.targetCharacterId,
          targetHp: targetHpAfter,
          duel: updated,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.action === 'complete') {
      if (!body.duelSessionId || !body.winnerCharacterId) {
        return new Response(JSON.stringify({ error: 'duelSessionId and winnerCharacterId required' }), {
          status: 400,
        })
      }

      const { data: duel } = await service
        .from('duel_sessions')
        .select('*')
        .eq('id', body.duelSessionId)
        .maybeSingle()

      if (!duel) {
        return new Response(JSON.stringify({ error: 'Duel not found' }), { status: 404 })
      }

      if (
        duel.challenger_character_id !== body.characterId &&
        duel.opponent_character_id !== body.characterId
      ) {
        return new Response(JSON.stringify({ error: 'Not a duel participant' }), { status: 403 })
      }

      if (duel.state === 'completed') {
        return new Response(JSON.stringify({ ok: true, duel }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!['countdown', 'active'].includes(duel.state)) {
        return new Response(JSON.stringify({ error: 'Duel is not active' }), { status: 400 })
      }

      const winnerId = body.winnerCharacterId
      if (
        winnerId !== duel.challenger_character_id &&
        winnerId !== duel.opponent_character_id
      ) {
        return new Response(JSON.stringify({ error: 'Invalid winner' }), { status: 400 })
      }

      const { data: completed, error } = await service
        .from('duel_sessions')
        .update({
          state: 'completed',
          winner_character_id: winnerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', duel.id)
        .select('*')
        .single()

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }

      return new Response(JSON.stringify({ ok: true, duel: completed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
  } catch (err) {
    if (err instanceof Response) return err
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}