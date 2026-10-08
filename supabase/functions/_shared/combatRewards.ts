import lootJson from './ro/loot.json' with { type: 'json' }
import mobsJson from './ro/mobs.json' with { type: 'json' }
import expTablesJson from './ro/expTables.json' with { type: 'json' }

type RoMobDrop = { itemId: string; rate: number }
type RoMob = {
  id: string
  level: number
  wikiBaseExp: number
  wikiJobExp: number
  drops: RoMobDrop[]
}

type RoLootConfig = typeof lootJson

const MOBS = (mobsJson as { mobs: RoMob[] }).mobs
const MOB_BY_ID = new Map(MOBS.map((m) => [m.id, m]))
const LOOT = lootJson as RoLootConfig
const EXP = expTablesJson as {
  baseLevelCap: number
  jobLevelCap: number
  baseExpToNext: number[]
  jobExpToNext: number[]
  statPointsOnBaseLevelUp: number[]
}

export function getMobDef(mobDefId: string): RoMob | undefined {
  return MOB_BY_ID.get(mobDefId)
}

function rollMobDrops(drops: RoMobDrop[], rng: () => number, dropRate = 1): string[] {
  const gained: string[] = []
  for (const drop of drops) {
    const roll = Math.floor(rng() * 10000)
    if (roll < Math.min(10000, Math.floor(drop.rate * dropRate))) gained.push(drop.itemId)
  }
  return gained
}

function rollMobZeny(level: number, rng: () => number): number {
  const loot = LOOT
  const min = level * loot.zeny.minLinear.levelMul + loot.zeny.minLinear.offset
  const max = level * loot.zeny.maxLinear.levelMul + loot.zeny.maxLinear.offset
  const lo = Math.max(1, Math.floor(min))
  const hi = Math.max(lo, Math.floor(max))
  if (hi === lo) return lo
  return lo + Math.floor(rng() * (hi - lo + 1))
}

function pickWeightedItem(
  items: { itemId: string; weight: number }[],
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

function rollLevelBandDrop(level: number, rng: () => number, dropRate = 1): string | null {
  const band = LOOT.levelBands.find((b) => level >= b.minLevel && level <= b.maxLevel)
  if (!band) return null
  const chanceRoll = Math.floor(rng() * 10000)
  if (chanceRoll >= Math.min(10000, Math.floor(band.chancePerMille * dropRate))) return null
  return pickWeightedItem(band.items, rng)
}

export function resolveMobKillLoot(mob: RoMob, rng: () => number, dropRate = 1): { zeny: number; itemIds: string[] } {
  const zeny = rollMobZeny(mob.level, rng)
  const fromMob = rollMobDrops(mob.drops, rng, dropRate)
  const bandItem = rollLevelBandDrop(mob.level, rng, dropRate)
  const itemIds = bandItem ? [...fromMob, bandItem] : fromMob
  return { zeny, itemIds }
}

export function baseExpRequiredForLevel(level: number): number {
  const idx = Math.min(Math.max(level, 1), EXP.baseLevelCap) - 1
  return EXP.baseExpToNext[idx] ?? EXP.baseExpToNext[EXP.baseExpToNext.length - 1]
}

export function jobExpRequiredForLevel(level: number): number {
  const cap = EXP.jobLevelCap
  const idx = Math.min(Math.max(level, 1), cap) - 1
  const row = EXP.jobExpToNext
  return row[idx] ?? row[row.length - 1] ?? 1
}

export function addBaseExp(
  baseLevel: number,
  baseExp: number,
  amount: number,
): { baseLevel: number; baseExp: number } {
  const cap = EXP.baseLevelCap
  let level = baseLevel
  let exp = baseExp
  if (level >= cap) return { baseLevel: level, baseExp: 0 }
  exp += amount
  while (level < cap) {
    const toNext = baseExpRequiredForLevel(level)
    if (toNext <= 0 || exp < toNext) break
    exp -= toNext
    level += 1
  }
  if (level >= cap) exp = 0
  return { baseLevel: level, baseExp: exp }
}

export function addJobExp(
  jobLevel: number,
  jobExp: number,
  amount: number,
  jobCap: number,
): { jobLevel: number; jobExp: number } {
  let level = jobLevel
  let exp = jobExp
  if (level >= jobCap) return { jobLevel: level, jobExp: 0 }
  exp += amount
  while (level < jobCap) {
    const toNext = jobExpRequiredForLevel(level)
    if (toNext <= 0 || exp < toNext) break
    exp -= toNext
    level += 1
  }
  if (level >= jobCap) exp = 0
  return { jobLevel: level, jobExp: exp }
}

export function statPointsForReachingBaseLevel(level: number): number {
  if (level < 1 || level > EXP.baseLevelCap) return 0
  return EXP.statPointsOnBaseLevelUp[level - 1] ?? 0
}
