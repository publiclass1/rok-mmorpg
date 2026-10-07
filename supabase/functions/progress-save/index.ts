import { corsHeaders } from '../_shared/cors.ts'
import { writeAuditLog } from '../_shared/auditLog.ts'
import {
  createAuthedClient,
  createServiceClient,
  getOwnedCharacter,
  requireUser,
} from '../_shared/supabase.ts'
import {
  type EquipRow,
  type ProgressPayload,
  type SkillRow,
  validateCharacterProgress,
} from '../_shared/validateProgress.ts'

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

type Body = {
  characterId: string
  progress: ProgressPayload
  skills: SkillRow[]
  equipment: EquipRow[]
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

    const validation = validateCharacterProgress(body.progress, body.skills ?? [], body.equipment ?? [])
    if (!validation.ok) {
      await writeAuditLog(service, body.characterId, 'progress_save_rejected', {
        error: validation.error,
      })
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const progressPayload = {
      ...body.progress,
      character_id: body.characterId,
      updated_at: new Date().toISOString(),
    }

    const { error: progressError } = await service
      .from('character_progress')
      .upsert(progressPayload, { onConflict: 'character_id' })

    if (progressError) {
      return new Response(JSON.stringify({ error: progressError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const skillRows = (body.skills ?? []).map((row) => ({
      character_id: body.characterId,
      skill_id: row.skill_id,
      level: row.level,
    }))

    await service.from('character_skills').delete().eq('character_id', body.characterId)
    if (skillRows.length > 0) {
      const { error: skillsErr } = await service.from('character_skills').insert(skillRows)
      if (skillsErr) {
        return new Response(JSON.stringify({ error: skillsErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const equipRows = (body.equipment ?? [])
      .filter((row) => EQUIP_SLOTS.includes(row.slot as typeof EQUIP_SLOTS[number]))
      .map((row) => ({
        character_id: body.characterId,
        slot: row.slot,
        item_id: row.item_id,
        instance_id: row.instance_id ?? null,
      }))

    await service.from('character_equipment').delete().eq('character_id', body.characterId)
    if (equipRows.length > 0) {
      const { error: equipErr } = await service.from('character_equipment').insert(equipRows)
      if (equipErr) {
        return new Response(JSON.stringify({ error: equipErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
