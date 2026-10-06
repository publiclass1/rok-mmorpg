import type { PrimaryStat } from './characterState'
import { jobBaseHp, jobBaseSp } from '../../content/ro/expTables'

export const SKILL_POINTS_PER_JOB_LEVEL = 1

/** Pre-Renewal stat raise cost (iRO Wiki / Stats). */
export function statRaiseCost(currentStat: number): number {
  return 2 + Math.floor((currentStat - 1) / 10)
}

/** Pre-Renewal max HP: job base table + VIT × 5 (HpIncrease 500 / 100). */
export function derivedMaxHp(jobId: string, baseLevel: number, vit: number): number {
  const base = jobBaseHp(jobId, baseLevel)
  return base + vit * 5
}

/** Pre-Renewal max SP: job base table + INT × 2 (SpIncrease 100 / 100). */
export function derivedMaxMp(jobId: string, baseLevel: number, int: number): number {
  const base = jobBaseSp(jobId, baseLevel)
  return base + int * 2
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
