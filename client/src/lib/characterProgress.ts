import { createInitialProgress, progressFromLevels, type PlayerProgressState } from '../game/combat/exp'
import { syncDerivedVitals, toCharacterSheetPayload } from '../game/character/characterSheet'
import { parseRolledItemsRecord } from '../game/items/rolledItem'
import { isRolledItemId, parseRolledBaseItemId } from '../game/items/rolledItem'
import {
  createDefaultEquipment,
  createInitialCharacterState,
  normalizeEquipment,
  parseSessionInventory,
  reconcileProgressBudgetForSave,
  type CharacterSessionState,
  type EquipSlot,
} from '../game/character/characterState'
import { parseActiveRental } from '../game/character/rental'
import type { CharacterRow } from '../types/database'
import { progressSave } from './api'
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
  rolled_items?: unknown
  active_rental?: unknown
}

type SkillRow = { skill_id: string; level: number }
type EquipRow = { slot: string; item_id: string; instance_id?: string | null; character_id?: string }

function equipmentFromRows(rows: EquipRow[]): Record<EquipSlot, string | null> {
  const equipment = createDefaultEquipment()
  for (const row of rows) {
    if (EQUIP_SLOTS.includes(row.slot as EquipSlot)) {
      equipment[row.slot as EquipSlot] = row.instance_id ?? row.item_id
    }
  }
  return normalizeEquipment(equipment)
}

function parseSkillBar(raw: unknown): (string | null)[] {
  const fallback = createInitialCharacterState().skillBar
  if (!Array.isArray(raw) || raw.length !== 9) return [...fallback]
  return raw.map((v) => (typeof v === 'string' ? v : null))
}

function rowToSession(
  progress: ProgressRow,
  skills: SkillRow[],
  equipmentRows: EquipRow[],
): CharacterSessionState {
  const equipment = equipmentFromRows(equipmentRows)

  const skillsMap: Record<string, number> = {}
  for (const row of skills) {
    skillsMap[row.skill_id] = row.level
  }
  if ((skillsMap.sit ?? 0) < 1) {
    skillsMap.sit = 1
  }
  if (Object.keys(skillsMap).length === 0) {
    skillsMap.basic_attack = 1
    skillsMap.sit = 1
  }

  let state: CharacterSessionState = {
    progress: progressFromLevels(
      progress.base_level,
      progress.base_exp,
      progress.job_level,
      progress.job_exp,
      progress.job_id,
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
    rolledItems: parseRolledItemsRecord(progress.rolled_items),
    activeRental: parseActiveRental(progress.active_rental),
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
    supabase.from('character_equipment').select('slot, item_id, instance_id').eq('character_id', characterId),
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

export type CharacterSelectEntry = {
  character: CharacterRow
  jobId: string
  progress: PlayerProgressState
  equipment: Record<EquipSlot, string | null>
}

type SelectProgressRow = {
  character_id: string
  job_id: string
  base_level: number
  base_exp: number
  job_level: number
  job_exp: number
}

export async function loadCharactersForSelect(
  userId: string,
): Promise<{ entries: CharacterSelectEntry[]; error: string | null }> {
  const { data: characters, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', userId)
    .order('slot', { ascending: true })

  if (charError) {
    return { entries: [], error: charError.message }
  }

  const list = (characters ?? []) as CharacterRow[]
  if (list.length === 0) {
    return { entries: [], error: null }
  }

  const ids = list.map((c) => c.id)
  const [progressRes, equipRes] = await Promise.all([
    supabase
      .from('character_progress')
      .select('character_id, job_id, base_level, base_exp, job_level, job_exp')
      .in('character_id', ids),
    supabase.from('character_equipment').select('character_id, slot, item_id').in('character_id', ids),
  ])

  if (progressRes.error) {
    return { entries: [], error: progressRes.error.message }
  }
  if (equipRes.error) {
    return { entries: [], error: equipRes.error.message }
  }

  const progressByChar = new Map<string, SelectProgressRow>()
  for (const row of (progressRes.data ?? []) as SelectProgressRow[]) {
    progressByChar.set(row.character_id, row)
  }

  const equipByChar = new Map<string, EquipRow[]>()
  for (const row of (equipRes.data ?? []) as EquipRow[]) {
    const cid = row.character_id
    if (!cid) continue
    const bucket = equipByChar.get(cid) ?? []
    bucket.push(row)
    equipByChar.set(cid, bucket)
  }

  const fallbackProgress = createInitialProgress()
  const entries: CharacterSelectEntry[] = list.map((character) => {
    const progressRow = progressByChar.get(character.id)
    const jobId = progressRow?.job_id ?? 'novice'
    const progress = progressRow
      ? progressFromLevels(
          progressRow.base_level,
          progressRow.base_exp,
          progressRow.job_level,
          progressRow.job_exp,
          jobId,
        )
      : { ...fallbackProgress }

    return {
      character,
      jobId,
      progress,
      equipment: equipmentFromRows(equipByChar.get(character.id) ?? []),
    }
  })

  return { entries, error: null }
}

export type CharacterWorldPosition = {
  x: number
  y: number
  mapId: string
}

export async function saveCharacterWorldPosition(
  characterId: string,
  world: CharacterWorldPosition,
): Promise<void> {
  const { error } = await supabase
    .from('characters')
    .update({
      x: world.x,
      y: world.y,
      map_id: world.mapId,
    })
    .eq('id', characterId)

  if (error) {
    throw new Error(error.message)
  }
}

/** M2 progress + `characters` row (position/map). Used on interval and when leaving the world. */
export async function persistCharacterWorld(
  characterId: string,
  world: CharacterWorldPosition,
  state: CharacterSessionState,
): Promise<void> {
  await Promise.all([saveCharacterWorldPosition(characterId, world), saveCharacterSession(characterId, state)])
}

let sessionSaveChain: Promise<void> = Promise.resolve()

export async function saveCharacterSession(characterId: string, state: CharacterSessionState): Promise<void> {
  const task = sessionSaveChain.then(() => writeCharacterSession(characterId, state))
  sessionSaveChain = task.catch(() => {})
  return task
}

async function writeCharacterSession(characterId: string, state: CharacterSessionState): Promise<void> {
  const synced = syncDerivedVitals(reconcileProgressBudgetForSave(state))
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
    rolled_items: synced.rolledItems,
    active_rental: synced.activeRental,
    updated_at: new Date().toISOString(),
  }

  const skillRows = Object.entries(synced.skills).map(([skill_id, level]) => ({
    skill_id,
    level,
  }))

  const equipRows = EQUIP_SLOTS.filter((slot) => synced.equipment[slot] != null).map((slot) => {
    const equippedId = synced.equipment[slot] as string
    const baseId = isRolledItemId(equippedId)
      ? (parseRolledBaseItemId(equippedId) ?? equippedId)
      : equippedId
    return {
      slot,
      item_id: baseId,
      instance_id: isRolledItemId(equippedId) ? equippedId : null,
    }
  })

  await progressSave({
    characterId,
    progress: progressPayload,
    skills: skillRows,
    equipment: equipRows,
  })
}
