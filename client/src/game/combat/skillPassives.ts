import type { CharacterSessionState } from '../character/characterState'
import type { WeaponClass } from '../../content/ro/types'
import { getEquippedWeaponClass } from './playerAttackRange'

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
