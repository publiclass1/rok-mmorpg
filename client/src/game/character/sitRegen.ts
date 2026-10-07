import { isPvpMap, PVP_HP_SP_REGEN_INTERVAL_MS, PVP_HP_SP_REGEN_PERCENT } from '../world/pvpConfig'

/** HP/SP restored each tick while sitting (Pre-Renewal-style rest; tuned for this client). */
export const SIT_REGEN_INTERVAL_MS = 2000

export function sitRegenIntervalMs(mapId: string): number {
  return isPvpMap(mapId) ? PVP_HP_SP_REGEN_INTERVAL_MS : SIT_REGEN_INTERVAL_MS
}

export function sitRegenAmounts(
  effectiveVit: number,
  effectiveInt: number,
  options?: { mapId?: string; hpMax?: number; mpMax?: number },
): { hp: number; mp: number } {
  if (options?.mapId && isPvpMap(options.mapId) && options.hpMax != null && options.mpMax != null) {
    return {
      hp: Math.max(1, Math.floor(options.hpMax * PVP_HP_SP_REGEN_PERCENT)),
      mp: Math.max(1, Math.floor(options.mpMax * PVP_HP_SP_REGEN_PERCENT)),
    }
  }
  return {
    hp: Math.max(1, 2 + Math.floor(effectiveVit / 4)),
    mp: Math.max(1, 1 + Math.floor(effectiveInt / 5)),
  }
}
