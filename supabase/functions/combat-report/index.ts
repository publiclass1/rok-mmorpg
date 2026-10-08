import { corsHeaders, jsonCorsHeaders, withCors } from '../_shared/cors.ts'
import { writeAuditLog } from '../_shared/auditLog.ts'
import {
  addBaseExp,
  addJobExp,
  getMobDef,
  resolveMobKillLoot,
} from '../_shared/combatRewards.ts'
import { mobSpawnsByMap, respawnMsForMapSpot } from '../_shared/expandMobSpots.ts'
import mobSpotsJson from '../_shared/ro/mobSpots.json' with { type: 'json' }
import jobsJson from '../_shared/ro/jobs.json' with { type: 'json' }
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'

const MOB_SPAWNS = mobSpawnsByMap(mobSpotsJson as Record<string, unknown[]>)
const KILL_RANGE_PX = 320
const MAX_KILLS_PER_MINUTE = 120
const SETTINGS_CACHE_TTL_MS = 5_000
let cachedRates: { expRate: number; dropRate: number; expiresAt: number } | null = null

type Body = {
  characterId: string
  mapId: string
  spawnIndex: number
  mobDefId: string
  x: number
  y: number
}

function jobCap(jobId: string): number {
  const job = (jobsJson as { jobs: { id: string; maxJobLevel?: number }[] }).jobs.find((j) => j.id === jobId)
  return job?.maxJobLevel ?? 50
}

async function loadRewardRates(service: ReturnType<typeof createServiceClient>) {
  if (cachedRates && cachedRates.expiresAt > Date.now()) return cachedRates
  const { data } = await service
    .from('game_settings')
    .select('key, value')
    .in('key', ['exp_rate', 'drop_rate'])
  const values = Object.fromEntries((data ?? []).map((row) => [row.key, Number(row.value)]))
  cachedRates = {
    expRate: Number.isFinite(values.exp_rate) && values.exp_rate > 0 ? values.exp_rate : 1,
    dropRate: Number.isFinite(values.drop_rate) && values.drop_rate > 0 ? values.drop_rate : 1,
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
  }
  return cachedRates
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

    const character = await getOwnedCharacter(client, user.id, body.characterId)
    if (character.map_id !== body.mapId) {
      return new Response(JSON.stringify({ error: 'Not on this map' }), {
        status: 400,
        headers: jsonCorsHeaders,
      })
    }

    const spawns = MOB_SPAWNS[body.mapId]
    if (!spawns || body.spawnIndex < 0 || body.spawnIndex >= spawns.length) {
      return new Response(JSON.stringify({ error: 'Invalid spawn index' }), {
        status: 400,
        headers: jsonCorsHeaders,
      })
    }
    const spawn = spawns[body.spawnIndex]
    if (spawn.defId !== body.mobDefId) {
      return new Response(JSON.stringify({ error: 'Mob mismatch at spawn' }), {
        status: 400,
        headers: jsonCorsHeaders,
      })
    }

    const mob = getMobDef(body.mobDefId)
    if (!mob) {
      return new Response(JSON.stringify({ error: 'Unknown mob' }), {
        status: 400,
        headers: jsonCorsHeaders,
      })
    }

    const dx = spawn.x - body.x
    const dy = spawn.y - body.y
    if (Math.hypot(dx, dy) > KILL_RANGE_PX) {
      return new Response(JSON.stringify({ error: 'Too far from mob spawn' }), {
        status: 400,
        headers: jsonCorsHeaders,
      })
    }

    const respawnMs = respawnMsForMapSpot(mobSpotsJson as Record<string, { spawnsPerMinute: number }[]>, body.mapId)
    const now = new Date()
    const lockUntil = new Date(now.getTime() + respawnMs)

    const { data: lockRow } = await service
      .from('field_spawn_kill_locks')
      .select('*')
      .eq('map_id', body.mapId)
      .eq('spawn_index', body.spawnIndex)
      .maybeSingle()

    if (lockRow && new Date(lockRow.locked_until) > now) {
      if (lockRow.last_killer_character_id !== body.characterId) {
        return new Response(JSON.stringify({ error: 'Spawn recently killed' }), {
          status: 409,
          headers: jsonCorsHeaders,
        })
      }
    }

    const oneMinuteAgo = new Date(now.getTime() - 60_000).toISOString()
    const { count: recentKills } = await service
      .from('character_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('character_id', body.characterId)
      .eq('event_type', 'mob_kill_grant')
      .gte('created_at', oneMinuteAgo)

    if ((recentKills ?? 0) >= MAX_KILLS_PER_MINUTE) {
      await writeAuditLog(service, body.characterId, 'mob_kill_rate_limited', { mapId: body.mapId })
      return new Response(JSON.stringify({ error: 'Kill rate limited' }), {
        status: 429,
        headers: jsonCorsHeaders,
      })
    }

    const [{ data: progress, error: progErr }, rates] = await Promise.all([
      service
        .from('character_progress')
        .select('*')
        .eq('character_id', body.characterId)
        .maybeSingle(),
      loadRewardRates(service),
    ])

    if (progErr || !progress) {
      return new Response(JSON.stringify({ error: 'Progress not found' }), {
        status: 404,
        headers: jsonCorsHeaders,
      })
    }

    const rng = () => Math.random()
    const loot = resolveMobKillLoot(mob, rng, rates.dropRate)
    const gained = {
      baseExp: Math.floor(mob.wikiBaseExp * rates.expRate),
      jobExp: Math.floor(mob.wikiJobExp * rates.expRate),
    }

    const baseAfter = addBaseExp(progress.base_level, progress.base_exp, gained.baseExp)
    const jobAfter = addJobExp(
      progress.job_level,
      progress.job_exp,
      gained.jobExp,
      jobCap(progress.job_id),
    )

    let nextZeny = character.zeny
    if (loot.zeny > 0) {
      nextZeny = character.zeny + loot.zeny
    }

    const { error: progUpdateErr } = await service
      .from('character_progress')
      .update({
        base_level: baseAfter.baseLevel,
        base_exp: baseAfter.baseExp,
        job_level: jobAfter.jobLevel,
        job_exp: jobAfter.jobExp,
        // Items are granted via ground-drop pickup, not immediately on kill.
        session_inventory: progress.session_inventory,
        updated_at: now.toISOString(),
      })
      .eq('character_id', body.characterId)

    if (progUpdateErr) {
      return new Response(JSON.stringify({ error: progUpdateErr.message }), {
        status: 400,
        headers: jsonCorsHeaders,
      })
    }

    if (loot.zeny > 0) {
      const { error: zenyErr } = await service
        .from('characters')
        .update({ zeny: nextZeny })
        .eq('id', body.characterId)
      if (zenyErr) {
        return new Response(JSON.stringify({ error: zenyErr.message }), {
          status: 400,
          headers: jsonCorsHeaders,
        })
      }
    }

    const dropRows = loot.itemIds.map((itemId) => ({
      map_id: body.mapId,
      item_id: itemId,
      x: body.x,
      y: body.y,
      owner_character_id: body.characterId,
      available_at: new Date(now.getTime() + 30_000).toISOString(),
      expires_at: new Date(now.getTime() + 180_000).toISOString(),
    }))
    const { data: drops, error: dropsErr } = dropRows.length
      ? await service.from('field_map_drops').insert(dropRows).select('id, map_id, item_id, x, y, owner_character_id, available_at, expires_at')
      : { data: [], error: null }
    if (dropsErr) {
      return new Response(JSON.stringify({ error: dropsErr.message }), { status: 400, headers: jsonCorsHeaders })
    }

    await service.from('field_spawn_kill_locks').upsert(
      {
        map_id: body.mapId,
        spawn_index: body.spawnIndex,
        locked_until: lockUntil.toISOString(),
        last_killer_character_id: body.characterId,
        mob_def_id: body.mobDefId,
        updated_at: now.toISOString(),
      },
      { onConflict: 'map_id,spawn_index' },
    )

    await writeAuditLog(service, body.characterId, 'mob_kill_grant', {
      mapId: body.mapId,
      spawnIndex: body.spawnIndex,
      mobDefId: body.mobDefId,
      baseExp: gained.baseExp,
      jobExp: gained.jobExp,
      zeny: loot.zeny,
      items: loot.itemIds,
    })

    return new Response(
      JSON.stringify({
        ok: true,
        baseExp: gained.baseExp,
        jobExp: gained.jobExp,
        zeny: loot.zeny,
        itemIds: loot.itemIds,
        drops: drops ?? [],
        progress: {
          baseLevel: baseAfter.baseLevel,
          baseExp: baseAfter.baseExp,
          jobLevel: jobAfter.jobLevel,
          jobExp: jobAfter.jobExp,
        },
        zenyTotal: nextZeny,
        sessionInventory: progress.session_inventory,
        drops: drops ?? [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    if (err instanceof Response) return withCors(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
