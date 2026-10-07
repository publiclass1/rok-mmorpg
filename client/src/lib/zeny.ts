import { characterEconomyAdjust } from './api'

/** Server-validated zeny change. Returns new balance or null on failure. */
export async function spendCharacterZeny(characterId: string, delta: number): Promise<number | null> {
  if (delta === 0) return null
  try {
    const res = await characterEconomyAdjust({ characterId, delta })
    return res.zeny
  } catch {
    return null
  }
}
