import { loadRoContent } from '../../content/ro/loadContent'
import type { GearRarityId, RoDungeonFloor, RoItem } from '../../content/ro/types'
import type { PrimaryStat } from '../character/characterState'

export type RolledEffectKind = 'melee' | 'range' | 'magic'

export type RolledItem = {
  id: string
  baseItemId: string
  rarity: GearRarityId
  requiredBaseLevel: number
  stats: Partial<Record<PrimaryStat, number>>
  effect: { kind: RolledEffectKind; percent: number }
  slots: 2
  cards: [string | null, string | null]
}

const PRIMARY_STATS: PrimaryStat[] = ['str', 'agi', 'vit', 'int', 'dex', 'luk']

const ROLLED_PREFIX = 'ri:'

export function isRolledItemId(itemId: string): boolean {
  return itemId.startsWith(ROLLED_PREFIX)
}

export function parseRolledBaseItemId(itemId: string): string | null {
  if (!isRolledItemId(itemId)) return null
  const rest = itemId.slice(ROLLED_PREFIX.length)
  const lastColon = rest.lastIndexOf(':')
  if (lastColon <= 0) return null
  return rest.slice(0, lastColon)
}

function randomId8(rng: () => number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(rng() * chars.length)]
  }
  return out
}

function pickWeightedRarity(weights: Record<GearRarityId, number>, rng: () => number): GearRarityId {
  const entries = Object.entries(weights) as Array<[GearRarityId, number]>
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let roll = rng() * total
  for (const [id, w] of entries) {
    roll -= w
    if (roll < 0) return id
  }
  return entries[entries.length - 1]?.[0] ?? 'common'
}

function rollLevelInBand(minLevel: number, maxLevel: number, rng: () => number): number {
  const raw = minLevel + Math.floor(rng() * (maxLevel - minLevel + 1))
  return Math.max(minLevel, Math.min(maxLevel, Math.floor(raw / 5) * 5 || minLevel))
}

function rollStats(rarity: GearRarityId, rng: () => number): Partial<Record<PrimaryStat, number>> {
  const { dungeons } = loadRoContent()
  const statMin = dungeons.gear.rarities[rarity].statMin
  const pool = [...PRIMARY_STATS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const picked = pool.slice(0, 3)
  const out: Partial<Record<PrimaryStat, number>> = {}
  for (const stat of picked) {
    const lo = statMin
    const hi = 10
    out[stat] = lo + Math.floor(rng() * (hi - lo + 1))
  }
  return out
}

function rollEffect(rarity: GearRarityId, rng: () => number): RolledItem['effect'] {
  const { dungeons } = loadRoContent()
  const effectMin = dungeons.gear.rarities[rarity].effectMin
  const kinds = dungeons.gear.effectKinds
  const kind = kinds[Math.floor(rng() * kinds.length)] ?? 'melee'
  const percent = effectMin + Math.floor(rng() * (25 - effectMin + 1))
  return { kind, percent }
}

function baseItemsForSlot(slot: string): RoItem[] {
  const { items, dungeons } = loadRoContent()
  const allowed = new Set(dungeons.gear.dropSlots)
  if (!allowed.has(slot)) return []
  return items.filter((i) => i.equipSlot === slot && i.bonuses && i.layerColor)
}

export function rollDungeonGear(floor: RoDungeonFloor, isMvp: boolean, rng = Math.random): RolledItem | null {
  const rolls = isMvp ? floor.gearDrop.mvpRolls : 1
  let result: RolledItem | null = null
  for (let r = 0; r < rolls; r++) {
    const chanceRoll = Math.floor(rng() * 10000)
    if (!isMvp && chanceRoll >= floor.gearDrop.chancePerMille) continue
    const { dungeons } = loadRoContent()
    const slots = dungeons.gear.dropSlots
    const slot = slots[Math.floor(rng() * slots.length)]
    const bases = baseItemsForSlot(slot)
    if (bases.length === 0) continue
    const base = bases[Math.floor(rng() * bases.length)]
    const rarity = pickWeightedRarity(floor.gearDrop.rarityWeights, rng)
    const id = `${ROLLED_PREFIX}${base.id}:${randomId8(rng)}`
    result = {
      id,
      baseItemId: base.id,
      rarity,
      requiredBaseLevel: rollLevelInBand(floor.minLevel, floor.maxLevel, rng),
      stats: rollStats(rarity, rng),
      effect: rollEffect(rarity, rng),
      slots: 2,
      cards: [null, null],
    }
    if (!isMvp) break
  }
  return result
}

export function rolledItemDisplayName(rolled: RolledItem): string {
  const base = loadRoContent().items.find((i) => i.id === rolled.baseItemId)
  const label = loadRoContent().dungeons.gear.rarities[rolled.rarity].label
  return `${label} ${base?.name ?? rolled.baseItemId}`
}

export function rarityColor(rarity: GearRarityId): string {
  return loadRoContent().dungeons.gear.rarities[rarity].color
}

export function parseRolledItemsRecord(raw: unknown): Record<string, RolledItem> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, RolledItem> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue
    const o = val as RolledItem
    if (typeof o.baseItemId === 'string' && o.rarity && o.effect) {
      out[key] = {
        id: typeof o.id === 'string' ? o.id : key,
        baseItemId: o.baseItemId,
        rarity: o.rarity,
        requiredBaseLevel: o.requiredBaseLevel ?? 1,
        stats: o.stats ?? {},
        effect: o.effect,
        slots: 2,
        cards: o.cards ?? [null, null],
      }
    }
  }
  return out
}

export function addRolledItemToSession(
  rolledItems: Record<string, RolledItem>,
  item: RolledItem,
): Record<string, RolledItem> {
  return { ...rolledItems, [item.id]: item }
}
