import type { CharacterSessionState } from '../character/characterState'
import type { WeaponClass } from '../../content/ro/types'
import { getEquippedWeaponClass } from './playerAttackRange'

export type BasicAttackKind = 'basic_attack'

/** Pre-Renewal approximation: +6% Blitz Beat damage per Steel Crow level (see iRO Steel Crow). */
export function steelCrowBlitzDamageMultiplier(skills: Record<string, number>): number {
  const lv = skills.steel_crow ?? 0
  if (lv <= 0) return 1
  return 1 + lv * 0.06
}

export function canSteelCrowAutoBlitzProc(input: {
  critical: boolean
  weaponClass: WeaponClass
  skills: Record<string, number>
  hasFalconRental: boolean
  attackKind: BasicAttackKind
}): boolean {
  return steelCrowProcSkipReason(input) === null
}

/** Human-readable reason when a Steel Crow proc cannot run (null = ok). */
export function steelCrowProcSkipReason(input: {
  critical: boolean
  weaponClass: WeaponClass
  skills: Record<string, number>
  hasFalconRental: boolean
  attackKind: BasicAttackKind
}): string | null {
  if (input.attackKind !== 'basic_attack') return 'only basic attacks can proc Steel Crow'
  if (!input.critical) return 'not a critical hit'
  if (input.weaponClass !== 'bow') return 'bow required'
  if ((input.skills.steel_crow ?? 0) < 1) return 'Steel Crow not learned'
  if ((input.skills.blitz_beat ?? 0) < 1) return 'Blitz Beat not learned'
  if (!input.hasFalconRental) return 'falcon rental required'
  return null
}

/** After damage calc on a basic attack hit — queue one Blitz proc if this returns true. */
export function shouldQueueSteelCrowProcAfterBasicCrit(input: {
  hit: boolean
  damage: number
  critical: boolean
  weaponClass: WeaponClass
  skills: Record<string, number>
  hasFalconRental: boolean
}): boolean {
  if (!input.hit || input.damage <= 0 || !input.critical) return false
  return canSteelCrowAutoBlitzProc({
    critical: input.critical,
    weaponClass: input.weaponClass,
    skills: input.skills,
    hasFalconRental: input.hasFalconRental,
    attackKind: 'basic_attack',
  })
}

/** +1 DEX per Owl's Eye level. */
export function skillPassiveDexBonus(skills: Record<string, number>): number {
  const lv = skills.owls_eye ?? 0
  return lv > 0 ? lv : 0
}

/** +3 HIT per Vulture's Eye level when using a bow. */
export function skillPassiveHitBonus(
  skills: Record<string, number>,
  weaponClass: WeaponClass,
): number {
  if (weaponClass !== 'bow') return 0
  const lv = skills.vultures_eye ?? 0
  return lv > 0 ? lv * 3 : 0
}

/** Beast Bane: +5% bow damage per level (approximation until mob race is in content). */
export function beastBaneDamageMultiplier(skills: Record<string, number>): number {
  const lv = skills.beast_bane ?? 0
  if (lv <= 0) return 1
  return 1 + lv * 0.05
}

export function skillPassiveHitBonusForState(state: CharacterSessionState): number {
  const weaponClass = getEquippedWeaponClass(state.equipment)
  return skillPassiveHitBonus(state.skills, weaponClass)
}
