import { getItemEquipRequirementsFromCatalog } from './itemCatalog'
import { JOB_NAMES } from './skillsConfig'

export type ItemEquipRequirements = {
  requiredBaseLevel: number
  requiredJobIds: string[] | null
}

export function getItemEquipRequirements(itemId: string): ItemEquipRequirements | null {
  return getItemEquipRequirementsFromCatalog(itemId)
}

export function checkCanEquipItem(
  params: { baseLevel: number; jobId: string },
  itemId: string,
): { ok: true } | { ok: false; reason: string } {
  const reqs = getItemEquipRequirements(itemId)
  if (!reqs) return { ok: false, reason: 'Item cannot be equipped.' }

  if (params.baseLevel < reqs.requiredBaseLevel) {
    return {
      ok: false,
      reason: `Need Base Lv ${reqs.requiredBaseLevel} (currently ${params.baseLevel}).`,
    }
  }

  if (reqs.requiredJobIds && !reqs.requiredJobIds.includes(params.jobId)) {
    const names = reqs.requiredJobIds.map((id) => JOB_NAMES[id] ?? id).join(', ')
    return { ok: false, reason: `Requires ${names} job.` }
  }

  return { ok: true }
}

export function meetsEquipRequirements(
  params: { baseLevel: number; jobId: string },
  itemId: string,
): boolean {
  return checkCanEquipItem(params, itemId).ok
}

export function formatEquipRequirements(itemId: string): string | null {
  const reqs = getItemEquipRequirements(itemId)
  if (!reqs) return null

  const levelPart = `Lv ${reqs.requiredBaseLevel}`
  if (!reqs.requiredJobIds) {
    return `${levelPart} · All jobs`
  }
  const jobPart = reqs.requiredJobIds.map((id) => JOB_NAMES[id] ?? id).join(', ')
  return `${levelPart} · ${jobPart}`
}
