import { progressFromLevels } from '../game/combat/exp'
import { syncDerivedVitals, toCharacterSheetPayload } from '../game/character/characterSheet'
import {
  createDefaultEquipment,
  createInitialCharacterState,
  normalizeEquipment,
  type CharacterSessionState,
  type EquipSlot,
} from '../game/character/characterState'
import { supabase } from './supabase'

const EQUIP_SLOTS: EquipSlot[] = [
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
]

type ProgressRow = {
  character_id: string
  job_id: string
  base_level: number
  base_exp: number
  job_level: number
  job_exp: number
  str: number
  agi: number
  vit: number
  stat_int: number
  dex: number
  luk: number
  stat_points_unspent: number
  skill_points_unspent: number
  hp: number | null
  mp: number | null
  skill_bar: unknown
  session_inventory: unknown
}

type SkillRow = { skill_id: string; level: number }
type EquipRow = { slot: string; item_id: string }

function parseSkillBar(raw: unknown): (string | null)[] {
  const fallback = createInitialCharacterState().skillBar
  if (!Array.isArray(raw) || raw.length !== 9) return [...fallback]
  return raw.map((v) => (typeof v === 'string' ? v : null))
}

function parseSessionInventory(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

function rowToSession(
  progress: ProgressRow,
  skills: SkillRow[],
  equipmentRows: EquipRow[],
): CharacterSessionState {
  const equipment = createDefaultEquipment()
  for (const row of equipmentRows) {
    if (EQUIP_SLOTS.includes(row.slot as EquipSlot)) {
      equipment[row.slot as EquipSlot] = row.item_id
    }
  }

  const skillsMap: Record<string, number> = {}
  for (const row of skills) {
    skillsMap[row.skill_id] = row.level
  }
  if (Object.keys(skillsMap).length === 0) {
    skillsMap.basic_attack = 1
  }

  let state: CharacterSessionState = {
    progress: progressFromLevels(
      progress.base_level,
      progress.base_exp,
      progress.job_level,
      progress.job_exp,
    ),
    str: progress.str,
    agi: progress.agi,
    vit: progress.vit,
    int: progress.stat_int,
    dex: progress.dex,
    luk: progress.luk,
    statPointsUnspent: progress.stat_points_unspent,
    jobId: progress.job_id,
    skillPointsUnspent: progress.skill_points_unspent,
    skills: skillsMap,
    equipment: normalizeEquipment(equipment),
    skillBar: parseSkillBar(progress.skill_bar),
    sessionInventory: parseSessionInventory(progress.session_inventory),
    hp: progress.hp ?? 0,
    mp: progress.mp ?? 0,
  }

  state = syncDerivedVitals(state)
  if (progress.hp == null || progress.mp == null) {
    const sheet = toCharacterSheetPayload(state)
    state = { ...state, hp: sheet.hpMax, mp: sheet.mpMax }
  }

  return state
}

export async function loadCharacterSession(characterId: string): Promise<CharacterSessionState> {
  const [progressRes, skillsRes, equipRes] = await Promise.all([
    supabase.from('character_progress').select('*').eq('character_id', characterId).maybeSingle(),
    supabase.from('character_skills').select('skill_id, level').eq('character_id', characterId),
    supabase.from('character_equipment').select('slot, item_id').eq('character_id', characterId),
  ])

  if (progressRes.error) {
    console.warn('loadCharacterSession progress', progressRes.error.message)
  }
  if (skillsRes.error) {
    console.warn('loadCharacterSession skills', skillsRes.error.message)
  }
  if (equipRes.error) {
    console.warn('loadCharacterSession equipment', equipRes.error.message)
  }

  const progress = progressRes.data as ProgressRow | null
  if (!progress) {
    return createInitialCharacterState()
  }

  return rowToSession(progress, (skillsRes.data ?? []) as SkillRow[], (equipRes.data ?? []) as EquipRow[])
}

export async function saveCharacterSession(characterId: string, state: CharacterSessionState): Promise<void> {
  const synced = syncDerivedVitals(state)
  const progressPayload = {
    character_id: characterId,
    job_id: synced.jobId,
    base_level: synced.progress.baseLevel,
    base_exp: synced.progress.baseExp,
    job_level: synced.progress.jobLevel,
    job_exp: synced.progress.jobExp,
    str: synced.str,
    agi: synced.agi,
    vit: synced.vit,
    stat_int: synced.int,
    dex: synced.dex,
    luk: synced.luk,
    stat_points_unspent: synced.statPointsUnspent,
    skill_points_unspent: synced.skillPointsUnspent,
    hp: synced.hp,
    mp: synced.mp,
    skill_bar: synced.skillBar,
    session_inventory: synced.sessionInventory,
    updated_at: new Date().toISOString(),
  }

  const { error: progressError } = await supabase
    .from('character_progress')
    .upsert(progressPayload, { onConflict: 'character_id' })

  if (progressError) {
    throw new Error(progressError.message)
  }

  const skillRows = Object.entries(synced.skills).map(([skill_id, level]) => ({
    character_id: characterId,
    skill_id,
    level,
  }))

  const { error: deleteSkillsError } = await supabase
    .from('character_skills')
    .delete()
    .eq('character_id', characterId)

  if (deleteSkillsError) {
    throw new Error(deleteSkillsError.message)
  }

  if (skillRows.length > 0) {
    const { error: insertSkillsError } = await supabase.from('character_skills').insert(skillRows)
    if (insertSkillsError) {
      throw new Error(insertSkillsError.message)
    }
  }

  const equipRows = EQUIP_SLOTS.filter((slot) => synced.equipment[slot] != null).map((slot) => ({
    character_id: characterId,
    slot,
    item_id: synced.equipment[slot] as string,
  }))

  const { error: deleteEquipError } = await supabase
    .from('character_equipment')
    .delete()
    .eq('character_id', characterId)

  if (deleteEquipError) {
    throw new Error(deleteEquipError.message)
  }

  if (equipRows.length > 0) {
    const { error: insertEquipError } = await supabase.from('character_equipment').insert(equipRows)
    if (insertEquipError) {
      throw new Error(insertEquipError.message)
    }
  }
}
