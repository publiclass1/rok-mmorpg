import type { PrimaryStat } from './characterState'

export const STAT_POINTS_PER_BASE_LEVEL = 3
export const SKILL_POINTS_PER_JOB_LEVEL = 1

export function statRaiseCost(currentStat: number): number {
  return 2 + Math.floor((currentStat - 1) / 10)
}

export function derivedMaxHp(baseLevel: number, vit: number): number {
  return 40 + baseLevel * 5 + vit * 2
}

export function derivedMaxMp(baseLevel: number, int: number): number {
  return 10 + baseLevel * 2 + int * 2
}

export function derivedAttackDamage(str: number, dex: number): number {
  return 10 + Math.floor(str / 5) + Math.floor(dex / 10)
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
