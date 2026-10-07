import { PVP_HP_SP_REGEN_INTERVAL_MS, PVP_HP_SP_REGEN_PERCENT } from '../world/pvpConfig'

/** Sit regen tick interval (ms); one tick per second at 5% max HP/SP per tick. */
export const SIT_REGEN_INTERVAL_MS = 1000

/** Fraction of max HP/SP restored each sit tick (0.05 = 5% per second). */
export const SIT_REGEN_PERCENT = 0.05

export function sitRegenIntervalMs(): number {
  return SIT_REGEN_INTERVAL_MS
}

export function sitRegenAmounts(hpMax: number, mpMax: number): { hp: number; mp: number } {
  return {
    hp: Math.max(1, Math.floor(hpMax * SIT_REGEN_PERCENT)),
    mp: Math.max(1, Math.floor(mpMax * SIT_REGEN_PERCENT)),
  }
}

export function pvpPassiveRegenIntervalMs(): number {
  return PVP_HP_SP_REGEN_INTERVAL_MS
}

export function pvpPassiveRegenAmounts(hpMax: number, mpMax: number): { hp: number; mp: number } {
  return {
    hp: Math.max(1, Math.floor(hpMax * PVP_HP_SP_REGEN_PERCENT)),
    mp: Math.max(1, Math.floor(mpMax * PVP_HP_SP_REGEN_PERCENT)),
  }
}
