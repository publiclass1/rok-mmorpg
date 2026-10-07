import type { CharacterSessionState } from '../character/characterState'
import { effectiveStats } from '../character/effectiveStats'

/** Minimum strike delay before projectiles / melee connect (matches attack windup). */
export const SKILL_STRIKE_WINDUP_MS = 55

/** Effective DEX at which variable cast time reaches 0 (game tuning; Classic wiki uses 150). */
export const DEX_FOR_ZERO_CAST = 130

/** Variable cast time reduction % from DEX alone (matches `calcPreRenewalCastTimeMs` DEX term). */
export function calcDexVariableCastReducePercent(dex: number): number {
  const clamped = Math.max(0, Math.min(DEX_FOR_ZERO_CAST, dex))
  return Math.min(100, Math.floor((clamped / DEX_FOR_ZERO_CAST) * 100))
}

export type CastTimeModifierOptions = {
  /** Suffragium skill level (15% VCT reduction per level in Classic). */
  suffragiumLevel?: number
  /** Sum of cast-time reduction % from gear/skills (Classic: × (1 − x×0.01)). */
  castTimeReducePercent?: number
}

/**
 * Pre-Renewal variable cast time (iRO Wiki Classic).
 * @see https://irowiki.org/classic/Cast_Time
 *
 * `baseCastMs` is the skill's base cast from content (`castTimeMs`).
 * `Cast = Base × (1 − DEX/DEX_FOR_ZERO_CAST) × (1 − 0.15×Suffragium) × (1 − x×0.01)` (zero cast at DEX 130)
 */
export function calcPreRenewalCastTimeMs(
  baseCastMs: number,
  dex: number,
  options?: CastTimeModifierOptions,
): number {
  if (baseCastMs <= 0) return 0

  const suf = Math.max(0, options?.suffragiumLevel ?? 0)
  const reducePct = Math.max(0, options?.castTimeReducePercent ?? 0)

  let mult = (1 - dex / DEX_FOR_ZERO_CAST) * (1 - 0.15 * suf) * (1 - reducePct * 0.01)
  if (mult < 0) mult = 0

  return Math.floor(baseCastMs * mult)
}

export function calcPreRenewalCastTimeMsFromSession(
  baseCastMs: number,
  session: CharacterSessionState,
  options?: CastTimeModifierOptions,
): number {
  const { dex } = effectiveStats(session)
  return calcPreRenewalCastTimeMs(baseCastMs, dex, options)
}

/** Cast bar duration + strike phase delay used by WorldScene / combat anim. */
export function skillCastStrikeDelayMs(
  baseCastMs: number,
  session: CharacterSessionState,
  options?: CastTimeModifierOptions,
): number {
  const castMs = calcPreRenewalCastTimeMsFromSession(baseCastMs, session, options)
  if (castMs <= 0) return SKILL_STRIKE_WINDUP_MS
  return Math.max(SKILL_STRIKE_WINDUP_MS, castMs)
}
