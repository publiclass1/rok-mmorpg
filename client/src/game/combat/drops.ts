import type { RoLootConfig, RoLootLevelBand, RoMobDrop } from '../../content/ro/types'
import type { MobDefinition } from './mobConfig'

/** Drop rate is per-mille (0–10000); 7000 ≈ 70%. */
export function rollMobDrops(drops: RoMobDrop[], rng = Math.random): string[] {
  const gained: string[] = []
  for (const drop of drops) {
    const roll = Math.floor(rng() * 10000)
    if (roll < drop.rate) gained.push(drop.itemId)
  }
  return gained
}

export function rollMobZeny(level: number, loot: RoLootConfig, rng = Math.random): number {
  const min =
    level * loot.zeny.minLinear.levelMul + loot.zeny.minLinear.offset
  const max =
    level * loot.zeny.maxLinear.levelMul + loot.zeny.maxLinear.offset
  const lo = Math.max(1, Math.floor(min))
  const hi = Math.max(lo, Math.floor(max))
  if (hi === lo) return lo
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function pickWeightedItem(
  items: RoLootLevelBand['items'],
  rng: () => number,
): string | null {
  const total = items.reduce((s, i) => s + i.weight, 0)
  if (total <= 0) return null
  let roll = rng() * total
  for (const entry of items) {
    roll -= entry.weight
    if (roll < 0) return entry.itemId
  }
  return items[items.length - 1]?.itemId ?? null
}

export function rollLevelBandDrop(
  level: number,
  bands: RoLootLevelBand[],
  rng = Math.random,
): string | null {
  const band = bands.find((b) => level >= b.minLevel && level <= b.maxLevel)
  if (!band) return null
  const chanceRoll = Math.floor(rng() * 10000)
  if (chanceRoll >= band.chancePerMille) return null
  return pickWeightedItem(band.items, rng)
}

export type MobKillLoot = {
  zeny: number
  itemIds: string[]
}

export function resolveMobKillLoot(
  def: Pick<MobDefinition, 'level' | 'drops'>,
  loot: RoLootConfig,
  rng = Math.random,
): MobKillLoot {
  const zeny = rollMobZeny(def.level, loot, rng)
  const fromMob = rollMobDrops(def.drops, rng)
  const bandItem = rollLevelBandDrop(def.level, loot.levelBands, rng)
  const itemIds = bandItem ? [...fromMob, bandItem] : fromMob
  return { zeny, itemIds }
}
