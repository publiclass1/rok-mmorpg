import type { RoMobDrop } from '../../content/ro/types'

/** Drop rate is per-mille (0–10000); 7000 ≈ 70%. */
export function rollMobDrops(drops: RoMobDrop[], rng = Math.random): string[] {
  const gained: string[] = []
  for (const drop of drops) {
    const roll = Math.floor(rng() * 10000)
    if (roll < drop.rate) gained.push(drop.itemId)
  }
  return gained
}
