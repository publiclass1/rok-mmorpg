import { randomBytes } from 'node:crypto'
import itemsJson from '../ro/items.json' with { type: 'json' }
import { rollGearAffixes } from './rollGearAffixes.js'
import type { GearRarityId, RolledItem, RoItem } from './types.js'

const ITEMS_BY_ID = Object.fromEntries(
  (itemsJson as { items: RoItem[] }).items.map((i) => [i.id, i]),
)

function randomId8(): string {
  return randomBytes(4).toString('hex').slice(0, 8)
}

export type CreateRolledGearOptions = {
  rarity: GearRarityId
  requiredBaseLevel: number
  jobId: string
}

export function createServerRolledGear(
  baseItemId: string,
  options: CreateRolledGearOptions,
  rng: () => number = Math.random,
): RolledItem | null {
  const base = ITEMS_BY_ID[baseItemId]
  if (!base?.equipSlot || !base.bonuses || !base.layerColor) return null
  const rolled = rollGearAffixes(options.rarity, options.jobId, base, rng)
  const id = `ri:${baseItemId}:${randomId8()}`
  return {
    id,
    baseItemId,
    rarity: options.rarity,
    requiredBaseLevel: options.requiredBaseLevel,
    stats: rolled.stats,
    affixes: rolled.affixes,
    effect: rolled.effect,
    slots: 2,
    cards: [null, null],
  }
}
