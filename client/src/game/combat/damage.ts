import type { CharacterSessionState } from '../character/characterState'
import type { DuelCombatSnapshot } from '../duel/duelCombatSnapshot'
import { effectiveStats } from '../character/effectiveStats'
import { equipmentBonusesFromState } from '../character/equipmentConfig'
import { applyBonuses } from '../character/statFormulas'
import { getItemCombatStats } from '../character/itemCatalog'
import { getItemWeaponClass } from '../character/itemCatalog'
import { sumEquippedCritChancePercent } from './critBonuses'
import { sumEquippedRolledDamagePercent } from '../items/rolledItemCombat'
import type { MobDefinition } from './mobConfig'
import { physicalSkillModifier, SKILLS, type SkillDefinition } from '../character/skillsConfig'
import {
  beastBaneDamageMultiplier,
  skillPassiveHitBonus,
  steelCrowBlitzDamageMultiplier,
} from './skillPassives'

/** Base Pre-Renewal crit damage before LUK bonus (iRO 140%). */
export const CRITICAL_DAMAGE_BASE = 1.4

/** +1% crit damage per 3 LUK (custom; stacks on 140% base). */
export function calcCritDamageMultiplier(effectiveLuk: number): number {
  return CRITICAL_DAMAGE_BASE + Math.floor(effectiveLuk / 3) * 0.01
}

/** @deprecated Use calcCritDamageMultiplier */
export const CRITICAL_DAMAGE_MULTIPLIER = CRITICAL_DAMAGE_BASE

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

export type CritChanceOptions = {
  critModifier?: number
  defenderLuk?: number
  /** Effective LUK; +1% crit per 3 LUK (stacks with gear). */
  attackerLuk?: number
  /** Default 0; no crit without gear or LUK. */
  minChancePercent?: number
}

/** Crit % from gear + floor(LUK/3) × modifier − floor(targetLUK/5). */
export function calcCritChancePercent(equipCritBonus: number, options?: CritChanceOptions): number {
  const critModifier = options?.critModifier ?? 1
  const defenderLuk = options?.defenderLuk ?? 0
  const attackerLuk = options?.attackerLuk ?? 0
  const minChance = options?.minChancePercent ?? 0
  const fromLuk = Math.floor(attackerLuk / 3)
  const raw = (equipCritBonus + fromLuk) * critModifier - Math.floor(defenderLuk / 5)
  return Math.max(minChance, raw)
}

export function rollCriticalHit(chancePercent: number, rng: () => number): boolean {
  if (chancePercent <= 0) return false
  return rng() * 100 < chancePercent
}

function rollPlayerCritVsMob(
  equipCritBonus: number,
  attackerLuk: number,
  defenderLuk: number,
  rng: () => number,
): boolean {
  const chance = calcCritChancePercent(equipCritBonus, { attackerLuk, defenderLuk })
  return rollCriticalHit(chance, rng)
}

function applyCriticalDamageMultiplier(damage: number, critical: boolean, effectiveLuk: number): number {
  if (!critical) return damage
  return Math.floor(damage * calcCritDamageMultiplier(effectiveLuk))
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

export function calcStatusAtk(baseLevel: number, str: number, dex: number, luk: number): number {
  return baseLevel + str + Math.floor(dex / 5) + Math.floor(luk / 3)
}

/** Pre-Renewal status MATK from INT (iRO Wiki Classic / INT). */
export function calcStatusMatkMin(int: number): number {
  const term = Math.floor(int / 7)
  return int + term * term
}

export function calcStatusMatkMax(int: number): number {
  const term = Math.floor(int / 5)
  return int + term * term
}

function softDef(vit: number): number {
  return vit
}

function damageAfterDef(atk: number, def: number, vit: number): number {
  const afterSoft = Math.max(0, atk - def)
  const vitReduce = Math.floor((afterSoft * vit) / 100)
  return Math.max(1, afterSoft - vitReduce)
}

function damageAfterMdef(matk: number, mdef: number, skillModifier: number): number {
  const scaled = matk * skillModifier * (1 - mdef / 100)
  return Math.max(1, Math.floor(scaled))
}

function sampleMatk(int: number, critical: boolean, rng: () => number): number {
  const min = calcStatusMatkMin(int)
  const max = calcStatusMatkMax(int)
  if (critical) return max
  if (min >= max) return min
  return min + Math.floor(rng() * (max - min + 1))
}

export function calcPlayerVsMobDamage(
  state: CharacterSessionState,
  mob: MobDefinition,
  options?: { attackElementOverride?: string; rng?: () => number; defenderLuk?: number },
): { damage: number; hit: boolean; critical: boolean } {
  const rng = options?.rng ?? Math.random
  const stats = effectiveStats(state)
  const equipCrit = sumEquippedCritChancePercent(state.equipment)
  const defenderLuk = options?.defenderLuk ?? 0
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  const weaponElement = options?.attackElementOverride ?? weapon?.attackElement ?? 'neutral'
  const weaponSize = weapon?.weaponSize ?? 'medium'

  const weaponClass = state.equipment.weapon ? getItemWeaponClass(state.equipment.weapon) : null
  const hitStat =
    calcHit(state.progress.baseLevel, stats.dex, stats.luk) +
    skillPassiveHitBonus(state.skills, weaponClass ?? 'unarmed')

  const critical = rollPlayerCritVsMob(equipCrit, stats.luk, defenderLuk, rng)
  let hit = critical
  if (!hit) {
    hit = rollHitSuccess(hitStat, mob.flee, rng)
  }
  if (!hit) return { damage: 0, hit: false, critical: false }

  const atk = calcStatusAtk(state.progress.baseLevel, stats.str, stats.dex, stats.luk) + weaponAtk
  const def = critical ? 0 : mob.def
  let damage = damageAfterDef(atk, def, 0)
  damage = applyCriticalDamageMultiplier(damage, critical, stats.luk)
  damage = Math.floor(damage * elementMultiplier(weaponElement, mob.element))
  damage = Math.floor(damage * sizeMultiplier(weaponSize, mob.size))
  const dmgKind = weaponClass === 'bow' ? 'range' : 'melee'
  const bonusPct = sumEquippedRolledDamagePercent(state.equipment, dmgKind)
  if (bonusPct > 0) {
    damage = Math.floor(damage * (1 + bonusPct / 100))
  }
  if (weaponClass === 'bow') {
    damage = Math.floor(damage * beastBaneDamageMultiplier(state.skills))
  }
  return { damage: Math.max(1, damage), hit: true, critical }
}

function defenderEffectiveStats(defender: DuelCombatSnapshot) {
  const bonuses = equipmentBonusesFromState(defender.equipment)
  return applyBonuses(
    {
      str: defender.str,
      agi: defender.agi,
      vit: defender.vit,
      int: defender.int,
      dex: defender.dex,
      luk: defender.luk,
    },
    bonuses,
  )
}

export function calcPlayerVsPlayerDamage(
  state: CharacterSessionState,
  defender: DuelCombatSnapshot,
  options?: { rng?: () => number },
): { damage: number; hit: boolean; critical: boolean } {
  const rng = options?.rng ?? Math.random
  const stats = effectiveStats(state)
  const defStats = defenderEffectiveStats(defender)
  const equipCrit = sumEquippedCritChancePercent(state.equipment)
  const defenderLuk = defStats.luk
  const defenderFlee = calcFlee(defender.baseLevel, defStats.agi, defStats.luk)
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  const weaponElement = weapon?.attackElement ?? 'neutral'
  const weaponSize = weapon?.weaponSize ?? 'medium'

  const critical = rollPlayerCritVsMob(equipCrit, stats.luk, defenderLuk, rng)
  let hit = critical
  if (!hit) {
    hit = rollHitSuccess(calcHit(state.progress.baseLevel, stats.dex, stats.luk), defenderFlee, rng)
  }
  if (!hit) return { damage: 0, hit: false, critical: false }

  const atk = calcStatusAtk(state.progress.baseLevel, stats.str, stats.dex, stats.luk) + weaponAtk
  const def = critical ? 0 : softDef(defStats.vit)
  let damage = damageAfterDef(atk, def, defStats.vit)
  damage = applyCriticalDamageMultiplier(damage, critical, stats.luk)
  damage = Math.floor(damage * elementMultiplier(weaponElement, 'neutral'))
  damage = Math.floor(damage * sizeMultiplier(weaponSize, 'medium'))
  const weaponClass = state.equipment.weapon ? getItemWeaponClass(state.equipment.weapon) : null
  const dmgKind = weaponClass === 'bow' ? 'range' : 'melee'
  const bonusPct = sumEquippedRolledDamagePercent(state.equipment, dmgKind)
  if (bonusPct > 0) {
    damage = Math.floor(damage * (1 + bonusPct / 100))
  }
  return { damage: Math.max(1, damage), hit: true, critical }
}

/** Scale basic attack result for active player skills (pre-renewal placeholders). */
const ARCHER_PHYSICAL_SKILL_IDS = new Set(['double_strafe', 'arrow_shower', 'blitz_beat'])

export function calcPlayerSkillVsMobDamage(
  base: { damage: number; hit: boolean; critical: boolean },
  skillId: string,
  skillLevel: number,
  skills?: Record<string, number>,
): { damage: number; hit: boolean; critical: boolean } {
  if (!base.hit || base.damage <= 0) return base
  let damage = base.damage
  const def = SKILLS[skillId]
  if (def?.physical) {
    damage = Math.max(1, Math.floor(base.damage * physicalSkillModifier(def, skillLevel)))
  }
  switch (skillId) {
    case 'bash':
    case 'mob_bash':
      damage = Math.max(1, Math.floor(base.damage * (1 + skillLevel * 0.15)) + skillLevel * 3)
      break
    case 'pierce':
      damage = Math.max(1, Math.floor(base.damage * (1 + skillLevel * 0.12)) + skillLevel * 4)
      break
    case 'spear_stab':
      damage = Math.max(1, Math.floor(base.damage * (1 + skillLevel * 0.14)) + skillLevel * 5)
      break
    case 'brandish_spear':
      damage = Math.max(1, Math.floor(base.damage * (0.85 + skillLevel * 0.08)))
      break
    case 'bowling_bash':
      damage = Math.max(1, Math.floor(base.damage * (1 + skillLevel * 0.18)) + skillLevel * 2)
      break
    case 'spear_boomerang':
      damage = Math.max(1, Math.floor(base.damage * (1 + skillLevel * 0.1)) + skillLevel * 3)
      break
    default:
      break
  }
  if (skills && ARCHER_PHYSICAL_SKILL_IDS.has(skillId)) {
    damage = Math.max(1, Math.floor(damage * beastBaneDamageMultiplier(skills)))
  }
  if (skills && skillId === 'blitz_beat') {
    damage = Math.max(1, Math.floor(damage * steelCrowBlitzDamageMultiplier(skills)))
  }
  return { ...base, damage }
}

export function calcPlayerMagicVsMobDamage(
  state: CharacterSessionState,
  mob: MobDefinition,
  options?: {
    skillModifier?: number
    attackElement?: string
    rng?: () => number
    defenderLuk?: number
  },
): { damage: number; critical: boolean } {
  const rng = options?.rng ?? Math.random
  const stats = effectiveStats(state)
  const equipCrit = sumEquippedCritChancePercent(state.equipment)
  const defenderLuk = options?.defenderLuk ?? 0
  const skillModifier = options?.skillModifier ?? 1
  const attackElement = options?.attackElement ?? 'neutral'

  const critical = rollPlayerCritVsMob(equipCrit, stats.luk, defenderLuk, rng)
  const matk = sampleMatk(stats.int, critical, rng)
  const mdef = critical ? 0 : mob.mdef
  let damage = damageAfterMdef(matk, mdef, skillModifier)
  damage = applyCriticalDamageMultiplier(damage, critical, stats.luk)
  damage = Math.floor(damage * elementMultiplier(attackElement, mob.element))
  const bonusPct = sumEquippedRolledDamagePercent(state.equipment, 'magic')
  if (bonusPct > 0) {
    damage = Math.floor(damage * (1 + bonusPct / 100))
  }
  return { damage: Math.max(1, damage), critical }
}

export function magicSkillModifier(def: SkillDefinition | undefined, skillLevel: number): number {
  const magic = def?.magic
  if (!magic) return 1
  const base = magic.skillModifierBase ?? 1
  const per = magic.skillModifierPerLevel ?? 0
  return base + per * Math.max(0, skillLevel - 1)
}

export type MagicSkillHitResult = {
  totalDamage: number
  hits: number
  criticalAny: boolean
  perHitDamage: number[]
}

function magicSkillElementAndModifier(
  skillId: string,
  skillLevel: number,
  mob: MobDefinition,
  def: SkillDefinition | undefined,
): { element: string; modifier: number } {
  const modifier = magicSkillModifier(def, skillLevel)
  let undeadMult = 1
  let element = def?.magic?.element ?? 'neutral'
  if (skillId === 'soul_strike' && mob.element === 'undead') {
    undeadMult = 1.5
    element = 'neutral'
  }
  return { element, modifier: modifier * undeadMult }
}

export function magicSkillHitCount(def: SkillDefinition | undefined, skillLevel: number): number {
  if (def?.magic?.hitsEqualLevel) return Math.max(1, skillLevel)
  return 1
}

/** One projectile / one damage roll (used when damage syncs to projectile arrival). */
/** Magic skill hit vs another player (PVP snapshot as MDEF / LUK stand-in). */
export function calcPlayerMagicSkillVsPlayerSnapshot(
  state: CharacterSessionState,
  defender: DuelCombatSnapshot,
  skillId: string,
  skillLevel: number,
  options?: { rng?: () => number },
): { damage: number; critical: boolean } {
  const defStats = defenderEffectiveStats(defender)
  const mob = {
    id: 'player',
    name: 'Player',
    level: defender.baseLevel,
    maxHp: 1,
    atk: 0,
    def: 0,
    mdef: defStats.int,
    element: 'neutral',
    size: 'medium',
    hit: 0,
    flee: 0,
    color: 0,
    aggroRange: 0,
    attackRange: 0,
    attackCooldownMs: 0,
    roamRadius: 0,
    moveSpeed: 0,
    wanderPauseMs: 0,
    wikiBaseExp: 0,
    wikiJobExp: 0,
    drops: [],
    skills: [],
    isBoss: false,
  } satisfies MobDefinition
  return calcPlayerMagicSkillSingleHit(state, mob, skillId, skillLevel, {
    ...options,
    defenderLuk: defStats.luk,
  })
}

export function calcPlayerMagicSkillSingleHit(
  state: CharacterSessionState,
  mob: MobDefinition,
  skillId: string,
  skillLevel: number,
  options?: { rng?: () => number; defenderLuk?: number },
): { damage: number; critical: boolean } {
  const def = SKILLS[skillId]
  const rng = options?.rng ?? Math.random
  const { element, modifier } = magicSkillElementAndModifier(skillId, skillLevel, mob, def)
  return calcPlayerMagicVsMobDamage(state, mob, {
    skillModifier: modifier,
    attackElement: element,
    rng,
    defenderLuk: options?.defenderLuk,
  })
}

export function calcPlayerMagicSkillVsMob(
  state: CharacterSessionState,
  mob: MobDefinition,
  skillId: string,
  skillLevel: number,
  options?: { rng?: () => number },
): MagicSkillHitResult {
  const def = SKILLS[skillId]
  const rng = options?.rng ?? Math.random
  const hitCount = magicSkillHitCount(def, skillLevel)

  const perHitDamage: number[] = []
  let criticalAny = false
  let total = 0

  for (let i = 0; i < hitCount; i++) {
    const { damage, critical } = calcPlayerMagicSkillSingleHit(state, mob, skillId, skillLevel, { rng })
    perHitDamage.push(damage)
    total += damage
    if (critical) criticalAny = true
  }

  return { totalDamage: total, hits: hitCount, criticalAny, perHitDamage }
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

/** Mob skill damage on player; returns 0 on miss or unsupported placeholder skills. */
export function calcMobSkillVsPlayerDamage(
  mob: MobDefinition,
  skillId: string,
  skillLevel: number,
  state: CharacterSessionState,
  rng = Math.random,
): number {
  if (skillId === 'provoke') return 0

  const base = calcMobVsPlayerDamage(mob, state, rng)
  if (base <= 0) return 0

  if (skillId === 'bash' || skillId === 'mob_bash') {
    return Math.max(1, Math.floor(base * (1 + skillLevel * 0.15)) + skillLevel * 3)
  }

  const skillDef = SKILLS[skillId]
  const mult = skillDef?.mobDamageMultiplier
  if (mult != null && mult > 0) {
    return Math.max(1, Math.floor(base * mult))
  }

  return base
}

export function previewPlayerAttack(state: CharacterSessionState): number {
  const stats = effectiveStats(state)
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  return calcStatusAtk(state.progress.baseLevel, stats.str, stats.dex, stats.luk) + weaponAtk
}
