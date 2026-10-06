/**
 * Multiplier applied to mob baseExp and jobExp on kill.
 * Example: 100 × Poring (15 base / 5 job) → 1500 base / 500 job.
 *
 * Set via client/.env: VITE_MOB_EXP_MULTIPLIER=100
 * Or change DEFAULT_MOB_EXP_MULTIPLIER for a repo-wide default.
 */
export const DEFAULT_MOB_EXP_MULTIPLIER = 100

function parseMultiplier(raw: unknown): number {
  if (raw === undefined || raw === '') return DEFAULT_MOB_EXP_MULTIPLIER
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MOB_EXP_MULTIPLIER
  return n
}

export const MOB_EXP_MULTIPLIER = parseMultiplier(import.meta.env.VITE_MOB_EXP_MULTIPLIER)

export function scaleMobExp(baseExp: number, jobExp: number): { baseExp: number; jobExp: number } {
  const m = MOB_EXP_MULTIPLIER
  if (m === 1) return { baseExp, jobExp }
  return {
    baseExp: Math.floor(baseExp * m),
    jobExp: Math.floor(jobExp * m),
  }
}
