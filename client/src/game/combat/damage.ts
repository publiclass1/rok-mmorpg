import type { CharacterSessionState } from '../character/characterState'
import { effectiveStats } from '../character/effectiveStats'
import { getItemCombatStats } from '../character/itemCatalog'
import type { MobDefinition } from './mobConfig'

/** Pre-Renewal physical hit chance (see iRO Wiki / Damage). */
export function calcHit(attackerLevel: number, dex: number, luk: number): number {
  return attackerLevel + dex + Math.floor(luk / 3)
}

export function calcFlee(defenderLevel: number, agi: number, luk: number): number {
  return defenderLevel + agi + Math.floor(luk / 5)
}

/** Returns true if the attack connects (5–95% band). */
export function rollHitSuccess(attackerHit: number, defenderFlee: number, rng = Math.random): boolean {
  const chance = Math.min(95, Math.max(5, 80 + attackerHit - defenderFlee))
  return rng() * 100 < chance
}

const ELEMENT_TABLE: Record<string, Record<string, number>> = {
  neutral: { neutral: 1, water: 1, earth: 1, fire: 1, wind: 1, poison: 0.75, holy: 1, shadow: 1, ghost: 0.25, undead: 1 },
  water: { neutral: 1, water: 0.25, earth: 1, fire: 0.5, wind: 1.75, poison: 1, holy: 1, shadow: 1, ghost: 1, undead: 1 },
  earth: { neutral: 1, water: 1, earth: 0.25, fire: 1.75, wind: 0.5, poison: 1, holy: 1, shadow: 1, ghost: 1, undead: 1 },
  fire: { neutral: 1, water: 1.75, earth: 0.5, fire: 0.25, wind: 1, poison: 1, holy: 1, shadow: 1, ghost: 1, undead: 1 },
  wind: { neutral: 1, water: 0.5, earth: 1.75, fire: 1, wind: 0.25, poison: 1, holy: 1, shadow: 1, ghost: 1, undead: 1 },
  poison: { neutral: 1, water: 1, earth: 1, fire: 1, wind: 1, poison: 0, holy: 1, shadow: 0.5, ghost: 0.5, undead: 0.5 },
  holy: { neutral: 1, water: 1, earth: 1, fire: 1, wind: 1, poison: 1, holy: 0, shadow: 1.25, ghost: 1, undead: 1.25 },
  shadow: { neutral: 1, water: 1, earth: 1, fire: 1, wind: 1, poison: 0.5, holy: 1.25, shadow: 0, ghost: 0.75, undead: 0.75 },
  ghost: { neutral: 0.25, water: 1, earth: 1, fire: 1, wind: 1, poison: 1, holy: 1, shadow: 1, ghost: 0.25, undead: 0 },
  undead: { neutral: 1, water: 1, earth: 1, fire: 1, wind: 1, poison: 0.5, holy: 1.25, shadow: 0.75, ghost: 1, undead: 0 },
}

const SIZE_MODIFIER: Record<string, Record<string, number>> = {
  small: { small: 1, medium: 0.75, large: 0.5 },
  medium: { small: 0.75, medium: 1, large: 0.75 },
  large: { small: 0.5, medium: 0.75, large: 1 },
}

function elementMultiplier(attackElement: string, defenseElement: string): number {
  const row = ELEMENT_TABLE[attackElement] ?? ELEMENT_TABLE.neutral
  return row[defenseElement] ?? 1
}

function sizeMultiplier(weaponSize: string, targetSize: string): number {
  const row = SIZE_MODIFIER[weaponSize] ?? SIZE_MODIFIER.medium
  return row[targetSize] ?? 1
}

function statusAtk(baseLevel: number, str: number, dex: number, luk: number): number {
  return baseLevel + str + Math.floor(dex / 5) + Math.floor(luk / 3)
}

function softDef(vit: number): number {
  return vit
}

function damageAfterDef(atk: number, def: number, vit: number): number {
  const afterSoft = Math.max(0, atk - def)
  const vitReduce = Math.floor((afterSoft * vit) / 100)
  return Math.max(1, afterSoft - vitReduce)
}

export function calcPlayerVsMobDamage(
  state: CharacterSessionState,
  mob: MobDefinition,
  options?: { attackElementOverride?: string; rng?: () => number },
): { damage: number; hit: boolean } {
  const rng = options?.rng ?? Math.random
  const stats = effectiveStats(state)
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  const weaponElement = options?.attackElementOverride ?? weapon?.attackElement ?? 'neutral'
  const weaponSize = weapon?.weaponSize ?? 'medium'

  const hit = rollHitSuccess(
    calcHit(state.progress.baseLevel, stats.dex, stats.luk),
    mob.flee,
    rng,
  )
  if (!hit) return { damage: 0, hit: false }

  const atk = statusAtk(state.progress.baseLevel, stats.str, stats.dex, stats.luk) + weaponAtk
  let damage = damageAfterDef(atk, mob.def, 0)
  damage = Math.floor(damage * elementMultiplier(weaponElement, mob.element))
  damage = Math.floor(damage * sizeMultiplier(weaponSize, mob.size))
  return { damage: Math.max(1, damage), hit: true }
}

export function calcMobVsPlayerDamage(mob: MobDefinition, state: CharacterSessionState, rng = Math.random): number {
  const stats = effectiveStats(state)
  const hit = rollHitSuccess(
    mob.hit,
    calcFlee(state.progress.baseLevel, stats.agi, stats.luk),
    rng,
  )
  if (!hit) return 0

  const atk = mob.atk
  const playerDef = softDef(stats.vit)
  let damage = damageAfterDef(atk, playerDef, stats.vit)
  damage = Math.floor(damage * elementMultiplier(mob.element, 'neutral'))
  return Math.max(1, damage)
}

export function previewPlayerAttack(state: CharacterSessionState): number {
  const stats = effectiveStats(state)
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  return statusAtk(state.progress.baseLevel, stats.str, stats.dex, stats.luk) + weaponAtk
}
