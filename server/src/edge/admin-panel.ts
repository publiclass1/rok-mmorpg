// @ts-nocheck
import { adminPasswordFromRequest, assertAdminPassword } from '../shared/adminAuth.js'
import { statPointsForReachingBaseLevel } from '../shared/combatRewards.js'
import { corsHeaders } from '../shared/cors.js'
import jobsJson from '../shared/ro/jobs.json'
import expTablesJson from '../shared/ro/expTables.json'
import { createServiceClient } from '../shared/supabase.js'

const ONLINE_WINDOW_SECONDS = 45
const MAX_ZENY_GRANT = 1_000_000_000
const MAX_LEVEL_DELTA_PER_REQUEST = 50
const SKILL_POINTS_PER_JOB_LEVEL = 1

const BASE_LEVEL_CAP = (expTablesJson as { baseLevelCap: number }).baseLevelCap

type Action =
  | 'stats'
  | 'search_characters'
  | 'set_gm'
  | 'unset_gm'
  | 'grant_zeny'
  | 'grant_levels'
  | 'audit_summary'
  | 'get_settings'
  | 'update_settings'

type Body = {
  action: Action
  adminPassword?: string
  q?: string
  gmOnly?: boolean
  characterId?: string
  name?: string
  amount?: number
  baseDelta?: number
  jobDelta?: number
  settings?: { expRate?: number; dropRate?: number }
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

function jobCap(jobId: string): number {
  const job = (jobsJson as { jobs: { id: string; maxJobLevel?: number }[] }).jobs.find((j) => j.id === jobId)
  return job?.maxJobLevel ?? 50
}

function parseLevelDelta(raw: number | undefined, label: string): number {
  const value = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Response(JSON.stringify({ error: `${label} must be a non-negative integer` }), { status: 400 })
  }
  if (value > MAX_LEVEL_DELTA_PER_REQUEST) {
    throw new Response(JSON.stringify({ error: `${label} cannot exceed ${MAX_LEVEL_DELTA_PER_REQUEST}` }), {
      status: 400,
    })
  }
  return value
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as Body
    assertAdminPassword(adminPasswordFromRequest(req, body))
    const service = createServiceClient()

    if (body.action === 'get_settings') {
      const { data, error } = await service.from('game_settings').select('key, value').in('key', ['exp_rate', 'drop_rate'])
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      const values = Object.fromEntries((data ?? []).map((row) => [row.key, Number(row.value)]))
      return new Response(JSON.stringify({ expRate: values.exp_rate ?? 1, dropRate: values.drop_rate ?? 1 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'update_settings') {
      const expRate = body.settings?.expRate
      const dropRate = body.settings?.dropRate
      if (![expRate, dropRate].every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1000)) {
        return new Response(JSON.stringify({ error: 'Rates must be between 0.01 and 1000.' }), { status: 400 })
      }
      const { error } = await service.from('game_settings').upsert([
        { key: 'exp_rate', value: expRate },
        { key: 'drop_rate', value: dropRate },
      ], { onConflict: 'key' })
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      return new Response(JSON.stringify({ ok: true, expRate, dropRate }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

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

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [rejectRes, rateRes] = await Promise.all([
        service
          .from('character_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'progress_save_rejected')
          .gte('created_at', since24h),
        service
          .from('character_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'mob_kill_rate_limited')
          .gte('created_at', since24h),
      ])

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
          auditFlags: {
            progressRejections24h: rejectRes.count ?? 0,
            mobKillRateLimited24h: rateRes.count ?? 0,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (body.action === 'audit_summary') {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await service
        .from('character_audit_log')
        .select('character_id, event_type, created_at, detail')
        .in('event_type', ['progress_save_rejected', 'mob_kill_rate_limited', 'mob_kill_grant'])
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 })
      }
      return new Response(JSON.stringify({ events: data ?? [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    if (body.action === 'grant_levels') {
      const baseDelta = parseLevelDelta(body.baseDelta, 'baseDelta')
      const jobDelta = parseLevelDelta(body.jobDelta, 'jobDelta')
      if (baseDelta === 0 && jobDelta === 0) {
        return new Response(JSON.stringify({ error: 'At least one of baseDelta or jobDelta must be greater than 0' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const id = await resolveCharacterId(service, body.characterId, body.name)
      const { data: progress, error: progErr } = await service
        .from('character_progress')
        .select(
          'character_id, job_id, base_level, base_exp, job_level, job_exp, stat_points_unspent, skill_points_unspent, hp, mp',
        )
        .eq('character_id', id)
        .maybeSingle()

      if (progErr || !progress) {
        return new Response(JSON.stringify({ error: 'Progress not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const oldBase = progress.base_level
      const oldJob = progress.job_level
      const jobLevelCap = jobCap(progress.job_id)
      const newBase = Math.min(BASE_LEVEL_CAP, oldBase + baseDelta)
      const newJob = Math.min(jobLevelCap, oldJob + jobDelta)

      let statPointsUnspent = progress.stat_points_unspent
      for (let lv = oldBase + 1; lv <= newBase; lv++) {
        statPointsUnspent += statPointsForReachingBaseLevel(lv)
      }

      const jobLevelsGained = newJob - oldJob
      const skillPointsUnspent = progress.skill_points_unspent + jobLevelsGained * SKILL_POINTS_PER_JOB_LEVEL

      let baseExp = progress.base_exp
      let jobExp = progress.job_exp
      if (newBase >= BASE_LEVEL_CAP) baseExp = 0
      if (newJob >= jobLevelCap) jobExp = 0

      const updatePayload: Record<string, unknown> = {
        base_level: newBase,
        base_exp: baseExp,
        job_level: newJob,
        job_exp: jobExp,
        stat_points_unspent: statPointsUnspent,
        skill_points_unspent: skillPointsUnspent,
        updated_at: new Date().toISOString(),
      }
      if (newBase > oldBase) {
        updatePayload.hp = null
        updatePayload.mp = null
      }

      const { error: updateErr } = await service.from('character_progress').update(updatePayload).eq('character_id', id)
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: character } = await service.from('characters').select('name').eq('id', id).maybeSingle()
      const name = character?.name ?? id
      const baseGained = newBase - oldBase
      const jobGained = newJob - oldJob
      const parts: string[] = []
      if (baseGained > 0) parts.push(`+${baseGained} base (now ${newBase})`)
      if (jobGained > 0) parts.push(`+${jobGained} job (now ${newJob})`)
      if (baseGained === 0 && baseDelta > 0) parts.push(`base already at cap (${newBase})`)
      if (jobGained === 0 && jobDelta > 0) parts.push(`job already at cap (${newJob})`)

      return new Response(
        JSON.stringify({
          ok: true,
          message: `Granted levels to ${name}: ${parts.join(', ')}.`,
          progress: {
            baseLevel: newBase,
            jobLevel: newJob,
            statPointsUnspent,
            skillPointsUnspent,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
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
}