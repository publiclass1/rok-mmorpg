/** HP/SP restored each tick while sitting (Pre-Renewal-style rest; tuned for this client). */
export const SIT_REGEN_INTERVAL_MS = 2000

export function sitRegenAmounts(effectiveVit: number, effectiveInt: number): { hp: number; mp: number } {
  return {
    hp: Math.max(1, 2 + Math.floor(effectiveVit / 4)),
    mp: Math.max(1, 1 + Math.floor(effectiveInt / 5)),
  }
}
