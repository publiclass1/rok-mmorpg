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
import { isValidSkillBarPayload, parseSkillBars, serializeSkillBars } from '../game/character/skillBars'
import type { CharacterRow } from '../types/database'
import { emitGameEvent } from '../game/events'
import { progressSave } from './api'
import { apiFetch } from './http'

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
  if ((skillsMap.play_dead ?? 0) < 1) {
    skillsMap.play_dead = 1
  }
  if (Object.keys(skillsMap).length === 0) {
    skillsMap.basic_attack = 1
    skillsMap.sit = 1
    skillsMap.play_dead = 1
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
    skillBars: parseSkillBars(progress.skill_bar),
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
  const data = await apiFetch<{
    progress: ProgressRow | null
    skills: SkillRow[]
    equipment: EquipRow[]
  }>(`/api/characters/${characterId}/session`)

  const progress = data.progress
  if (!progress) {
    return createInitialCharacterState()
  }

  return rowToSession(progress, data.skills ?? [], data.equipment ?? [])
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
  _userId: string,
): Promise<{ entries: CharacterSelectEntry[]; error: string | null }> {
  try {
    const { entries: raw } = await apiFetch<{
      entries: Array<{
        character: CharacterRow
        progress: SelectProgressRow | null
        equipment: EquipRow[]
      }>
    }>('/api/characters/select-entries')

    const list = raw.map((r) => r.character)
    if (list.length === 0) {
      return { entries: [], error: null }
    }

    const progressByChar = new Map<string, SelectProgressRow>()
    const equipByChar = new Map<string, EquipRow[]>()
    for (const row of raw) {
      if (row.progress) progressByChar.set(row.character.id, row.progress)
      equipByChar.set(row.character.id, row.equipment ?? [])
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
  } catch (err) {
    return { entries: [], error: err instanceof Error ? err.message : String(err) }
  }
}

export type CharacterWorldPosition = {
  x: number
  y: number
  mapId: string
}

export function normalizeCharacterWorldPosition(world: CharacterWorldPosition): CharacterWorldPosition {
  return {
    x: Math.round(world.x),
    y: Math.round(world.y),
    mapId: world.mapId,
  }
}

function worldPositionMatches(a: CharacterWorldPosition, b: CharacterWorldPosition): boolean {
  const left = normalizeCharacterWorldPosition(a)
  const right = normalizeCharacterWorldPosition(b)
  return left.x === right.x && left.y === right.y && left.mapId === right.mapId
}

export async function saveCharacterWorldPosition(
  characterId: string,
  world: CharacterWorldPosition,
  baseline?: CharacterWorldPosition | null,
): Promise<void> {
  const normalized = normalizeCharacterWorldPosition(world)
  if (baseline != null && worldPositionMatches(normalized, baseline)) {
    return
  }

  await apiFetch(`/api/characters/${characterId}/world`, {
    method: 'PATCH',
    body: JSON.stringify({ map_id: normalized.mapId, x: normalized.x, y: normalized.y }),
  })
}

/** M2 progress + `characters` row (position/map). Used on interval and when leaving the world. */
export async function persistCharacterWorld(
  characterId: string,
  world: CharacterWorldPosition,
  state: CharacterSessionState,
  baseline?: CharacterWorldPosition | null,
): Promise<void> {
  await Promise.all([
    saveCharacterWorldPosition(characterId, world, baseline),
    saveCharacterSession(characterId, state),
  ])
}

let sessionSaveChain: Promise<void> = Promise.resolve()

export async function saveCharacterSession(characterId: string, state: CharacterSessionState): Promise<void> {
  const task = sessionSaveChain.then(() => writeCharacterSession(characterId, state))
  sessionSaveChain = task.catch(() => {})
  return task
}

function formatProgressSaveError(err: unknown): string {
  const base = err instanceof Error ? err.message : String(err)
  if (base === 'invalid skill_bar') {
    return (
      'invalid skill_bar (progress-save rejected the skill bar JSON). ' +
      'If you use extra skill bar rows (Q/W/E…), deploy the updated progress-save Edge Function. ' +
      'Otherwise restart the dev server so the latest client build is loaded.'
    )
  }
  return base
}

async function writeCharacterSession(characterId: string, state: CharacterSessionState): Promise<void> {
  const synced = syncDerivedVitals(reconcileProgressBudgetForSave(state))
  const skillBar = serializeSkillBars(synced.skillBars)
  if (!isValidSkillBarPayload(skillBar)) {
    throw new Error('invalid skill_bar (client could not normalize skill bar before save)')
  }

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
    skill_bar: skillBar,
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

  try {
    await progressSave({
      characterId,
      progress: progressPayload,
      skills: skillRows,
      equipment: equipRows,
    })
  } catch (err) {
    const message = formatProgressSaveError(err)
    emitGameEvent('progressSaveError', { message })
    throw new Error(message)
  }
}
