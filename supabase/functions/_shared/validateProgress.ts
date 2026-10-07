import itemsJson from './ro/items.json' with { type: 'json' }
import jobsJson from './ro/jobs.json' with { type: 'json' }
import skillsJson from './ro/skills.json' with { type: 'json' }
import {
  baseExpRequiredForLevel,
  jobExpRequiredForLevel,
  statPointsForReachingBaseLevel,
} from './combatRewards.ts'

const ITEM_IDS = new Set((itemsJson as { items: { id: string; equip_slot?: string | null }[] }).items.map((i) => i.id))
const ITEM_SLOT = new Map(
  (itemsJson as { items: { id: string; equip_slot?: string | null }[] }).items.map((i) => [i.id, i.equip_slot ?? null]),
)
const JOB_IDS = new Set((jobsJson as { jobs: { id: string; maxJobLevel?: number }[] }).jobs.map((j) => j.id))
const JOB_MAX_LEVEL = new Map(
  (jobsJson as { jobs: { id: string; maxJobLevel?: number }[] }).jobs.map((j) => [j.id, j.maxJobLevel ?? 50]),
)
const JOB_PARENT = new Map(
  (jobsJson as { jobs: { id: string; parentJobId?: string | null }[] }).jobs.map((j) => [
    j.id,
    j.parentJobId ?? null,
  ]),
)

function jobAncestorIds(jobId: string): string[] {
  const out: string[] = []
  let cur: string | null = jobId
  while (cur) {
    out.push(cur)
    cur = JOB_PARENT.get(cur) ?? null
  }
  return out
}

const GENERAL_ACTION_SKILL_IDS = new Set(['basic_attack', 'sit', 'play_dead'])

type SkillDef = { id: string; maxLevel: number; jobId?: string }

const GENERAL_SKILL_DEFS: SkillDef[] = [
  { id: 'basic_attack', maxLevel: 1, jobId: 'novice' },
  { id: 'sit', maxLevel: 1, jobId: 'novice' },
  { id: 'play_dead', maxLevel: 1, jobId: 'novice' },
]

function jobCanUseSkillFromJob(currentJobId: string, skillJobId: string, skillId: string): boolean {
  if (GENERAL_ACTION_SKILL_IDS.has(skillId)) return true
  if (skillJobId === 'novice') return currentJobId === 'novice'
  return jobAncestorIds(currentJobId).includes(skillJobId)
}

const SKILLS = new Map(
  (skillsJson as { skills: SkillDef[] }).skills.map((s) => [s.id, s]),
)

for (const def of GENERAL_SKILL_DEFS) {
  if (!SKILLS.has(def.id)) SKILLS.set(def.id, def)
}

function skillDef(skillId: string): SkillDef | undefined {
  return SKILLS.get(skillId)
}

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

const SKILL_POINTS_PER_JOB_LEVEL = 1

export type ProgressPayload = {
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

export type SkillRow = { skill_id: string; level: number }
export type EquipRow = { slot: string; item_id: string; instance_id?: string | null }

function statRaiseCost(currentStat: number): number {
  return 2 + Math.floor((currentStat - 1) / 10)
}

function costToRaiseStatFromTo(from: number, to: number): number {
  let cost = 0
  for (let v = from; v < to; v++) {
    cost += statRaiseCost(v)
  }
  return cost
}

function totalStatPointsEarned(baseLevel: number): number {
  let earned = 0
  for (let lv = 2; lv <= baseLevel; lv++) {
    earned += statPointsForReachingBaseLevel(lv)
  }
  return earned
}

function validateStatBudget(payload: ProgressPayload): string | null {
  const stats = [payload.str, payload.agi, payload.vit, payload.stat_int, payload.dex, payload.luk]
  if (stats.some((s) => s < 1 || s > 99)) return 'invalid stat value'
  const spent =
    costToRaiseStatFromTo(1, payload.str) +
    costToRaiseStatFromTo(1, payload.agi) +
    costToRaiseStatFromTo(1, payload.vit) +
    costToRaiseStatFromTo(1, payload.stat_int) +
    costToRaiseStatFromTo(1, payload.dex) +
    costToRaiseStatFromTo(1, payload.luk)
  const earned = totalStatPointsEarned(payload.base_level)
  if (spent > earned) return 'stat points overspent'
  if (payload.stat_points_unspent !== earned - spent) return 'stat points unspent mismatch'
  return null
}

function totalSkillPointsEarned(jobId: string, jobLevel: number): number {
  const ancestors = jobAncestorIds(jobId).filter((id) => id !== 'novice')
  let earned = Math.max(0, (jobLevel - 1) * SKILL_POINTS_PER_JOB_LEVEL)
  if (ancestors.length <= 1) return earned
  for (let i = 1; i < ancestors.length; i++) {
    const ancestorJobId = ancestors[i]
    const maxLv = JOB_MAX_LEVEL.get(ancestorJobId) ?? 50
    earned += Math.max(0, (maxLv - 1) * SKILL_POINTS_PER_JOB_LEVEL)
  }
  return earned
}

function validateSkillBudget(jobId: string, jobLevel: number, skills: SkillRow[], unspent: number): string | null {
  const earned = totalSkillPointsEarned(jobId, jobLevel)
  let spent = 0
  for (const row of skills) {
    const def = skillDef(row.skill_id)
    if (!def) return `unknown skill ${row.skill_id}`
    if (row.level < 1 || row.level > def.maxLevel) return `invalid skill level ${row.skill_id}`
    if (def.jobId && !jobCanUseSkillFromJob(jobId, def.jobId, row.skill_id)) {
      return `skill ${row.skill_id} not allowed for job ${jobId}`
    }
    const freeLevel =
      row.skill_id === 'basic_attack' || row.skill_id === 'sit' || row.skill_id === 'play_dead' ? 1 : 0
    spent += row.level - freeLevel
    if (freeLevel > 0 && row.level < 1) return `${row.skill_id} level invalid`
  }
  if (spent < 0) return 'invalid skill spend'
  if (unspent !== earned - spent) return 'skill points unspent mismatch'
  return null
}

function parseSessionInventory(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const entry of raw) {
    if (typeof entry === 'string') {
      out.push(entry)
      continue
    }
    if (entry && typeof entry === 'object' && 'itemId' in entry) {
      const itemId = (entry as { itemId: string }).itemId
      const qty = (entry as { quantity?: number }).quantity ?? 1
      for (let i = 0; i < Math.max(1, qty); i++) out.push(itemId)
    }
  }
  return out
}

function parseRolledBaseItemId(id: string): string | null {
  const idx = id.indexOf('::')
  if (idx <= 0) return null
  return id.slice(0, idx)
}

function isKnownItemId(itemId: string): boolean {
  if (ITEM_IDS.has(itemId)) return true
  const base = parseRolledBaseItemId(itemId)
  return base != null && ITEM_IDS.has(base)
}

export function validateCharacterProgress(
  payload: ProgressPayload,
  skills: SkillRow[],
  equipment: EquipRow[],
): { ok: true } | { ok: false; error: string } {
  if (!JOB_IDS.has(payload.job_id)) return { ok: false, error: 'invalid job_id' }
  const jobCap = JOB_MAX_LEVEL.get(payload.job_id) ?? 50
  if (payload.base_level < 1 || payload.base_level > 99) return { ok: false, error: 'invalid base_level' }
  if (payload.job_level < 1 || payload.job_level > jobCap) return { ok: false, error: 'invalid job_level' }

  const baseCap = 99
  if (payload.base_level < baseCap && payload.base_exp >= baseExpRequiredForLevel(payload.base_level)) {
    return { ok: false, error: 'base_exp exceeds threshold for level' }
  }
  if (payload.job_level < jobCap && payload.job_exp >= jobExpRequiredForLevel(payload.job_level)) {
    return { ok: false, error: 'job_exp exceeds threshold for level' }
  }

  const statErr = validateStatBudget(payload)
  if (statErr) return { ok: false, error: statErr }

  const skillErr = validateSkillBudget(payload.job_id, payload.job_level, skills, payload.skill_points_unspent)
  if (skillErr) return { ok: false, error: skillErr }

  if (!Array.isArray(payload.skill_bar) || payload.skill_bar.length !== 9) {
    return { ok: false, error: 'invalid skill_bar' }
  }

  const inv = parseSessionInventory(payload.session_inventory)
  for (const itemId of inv) {
    if (!isKnownItemId(itemId)) return { ok: false, error: `unknown inventory item ${itemId}` }
  }

  for (const row of equipment) {
    if (!EQUIP_SLOTS.includes(row.slot as typeof EQUIP_SLOTS[number])) {
      return { ok: false, error: `invalid equip slot ${row.slot}` }
    }
    const baseId = row.item_id
    if (!ITEM_IDS.has(baseId)) return { ok: false, error: `unknown equipment item ${baseId}` }
    const slot = ITEM_SLOT.get(baseId)
    if (slot && slot !== row.slot) return { ok: false, error: `item ${baseId} wrong slot` }
    if (row.instance_id && !isKnownItemId(row.instance_id)) {
      return { ok: false, error: `unknown instance_id ${row.instance_id}` }
    }
  }

  if (payload.hp != null && payload.hp < 0) return { ok: false, error: 'invalid hp' }
  if (payload.mp != null && payload.mp < 0) return { ok: false, error: 'invalid mp' }

  return { ok: true }
}
