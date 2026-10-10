import jobBonusesJson from '../../../../content/ro/jobBonuses.json'
import type { RoJobBonusGrant, RoJobBonusesConfig } from '../../content/ro/types'
import type { StatBonuses } from './statFormulas'

const EMPTY: StatBonuses = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }

let cached: RoJobBonusesConfig | null = null

function config(): RoJobBonusesConfig {
  if (!cached) cached = jobBonusesJson as RoJobBonusesConfig
  return cached
}

function grantToBonuses(grant: RoJobBonusGrant): StatBonuses {
  return {
    str: grant.str ?? 0,
    agi: grant.agi ?? 0,
    vit: grant.vit ?? 0,
    int: grant.int ?? 0,
    dex: grant.dex ?? 0,
    luk: grant.luk ?? 0,
  }
}

/** Cumulative Renewal-style job level stat bonuses for the current job only (iRO Wiki Job Bonuses tables). */
export function jobLevelStatBonus(jobId: string, jobLevel: number): StatBonuses {
  const job = config().jobs[jobId]
  if (!job?.bonusAtJobLevel?.length) return { ...EMPTY }
  const level = Math.max(0, Math.floor(jobLevel))
  const out = { ...EMPTY }
  for (const grant of job.bonusAtJobLevel) {
    if (grant.jobLevel > level) continue
    const b = grantToBonuses(grant)
    out.str += b.str
    out.agi += b.agi
    out.vit += b.vit
    out.int += b.int
    out.dex += b.dex
    out.luk += b.luk
  }
  return out
}
