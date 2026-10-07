import type { PrimaryStat } from './characterState'
import { loadRoContent } from '../../content/ro/loadContent'

export const SKILL_POINTS_PER_JOB_LEVEL = 1

const DEFAULT_HP_JOB_A = 0
const DEFAULT_HP_JOB_B = 5
const DEFAULT_SP_JOB = 1

/** Zeny cost to reset allocated base stats back to 1 and refund stat points. */
export const STAT_RESET_ZENY_COST = 10_000

/** Zeny cost to reset allocated job skills and refund skill points. */
export const SKILL_RESET_ZENY_COST = 10_000

/** Pre-Renewal stat raise cost (iRO Wiki / Stats). */
export function statRaiseCost(currentStat: number): number {
  return 2 + Math.floor((currentStat - 1) / 10)
}

type JobVitalCoeffs = {
  hpJobA: number
  hpJobB: number
  spJob: number
  transMod: number
}

function jobVitalCoeffs(jobId: string): JobVitalCoeffs {
  const jobs = loadRoContent().jobs
  const job = jobs.find((j) => j.id === jobId) ?? jobs.find((j) => j.id === 'novice')
  return {
    hpJobA: job?.hpJobA ?? DEFAULT_HP_JOB_A,
    hpJobB: job?.hpJobB ?? DEFAULT_HP_JOB_B,
    spJob: job?.spJob ?? DEFAULT_SP_JOB,
    transMod: job?.transcendent ? 1.25 : 1,
  }
}

/** iRO Classic base HP before VIT (https://irowiki.org/classic/Max_HP). */
export function calcBaseHp(jobId: string, baseLevel: number): number {
  const level = Math.max(1, Math.floor(baseLevel))
  const { hpJobA, hpJobB } = jobVitalCoeffs(jobId)
  let base = 35 + level * hpJobB
  for (let i = 2; i <= level; i++) {
    base += Math.round(hpJobA * i)
  }
  return base
}

/** iRO Classic base SP before INT (https://irowiki.org/classic/Max_SP). */
export function calcBaseSp(jobId: string, baseLevel: number): number {
  const level = Math.max(1, Math.floor(baseLevel))
  const { spJob } = jobVitalCoeffs(jobId)
  return 10 + level * spJob
}

/** Pre-Renewal max HP: floor(baseHp × (1 + VIT × 0.01) × TRANS_MOD). */
export function derivedMaxHp(jobId: string, baseLevel: number, vit: number): number {
  const { transMod } = jobVitalCoeffs(jobId)
  const baseHp = calcBaseHp(jobId, baseLevel)
  return Math.floor(baseHp * (1 + vit * 0.01) * transMod)
}

/** Pre-Renewal max SP: INT mult then TRANS_MOD (classic order). */
export function derivedMaxMp(jobId: string, baseLevel: number, int: number): number {
  const { transMod } = jobVitalCoeffs(jobId)
  const baseSp = calcBaseSp(jobId, baseLevel)
  let maxSp = Math.floor(baseSp * (1 + int * 0.01))
  maxSp = Math.floor(maxSp * transMod)
  return maxSp
}

export function moveSpeedFromAgi(agi: number): number {
  return 140 + Math.min(agi, 99)
}

export type StatBonuses = { str: number; agi: number; vit: number; int: number; dex: number; luk: number }

export function applyBonuses(
  base: Record<PrimaryStat, number>,
  bonuses: StatBonuses,
): Record<PrimaryStat, number> {
  return {
    str: base.str + bonuses.str,
    agi: base.agi + bonuses.agi,
    vit: base.vit + bonuses.vit,
    int: base.int + bonuses.int,
    dex: base.dex + bonuses.dex,
    luk: base.luk + bonuses.luk,
  }
}
