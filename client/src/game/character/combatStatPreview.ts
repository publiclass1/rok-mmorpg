import type { CharacterSessionState } from './characterState'
import {
  calcCritChancePercent,
  calcFlee,
  calcHit,
  calcStatusAtk,
  calcStatusMatkMax,
  calcStatusMatkMin,
} from '../combat/damage'
import { sumEquippedCritChancePercent } from '../combat/critBonuses'
import { sumEquippedCombatAffixes } from '../items/rolledItemCombat'
import { sessionMaxHp, sessionMaxMp } from './gearVitals'
import { calcDexVariableCastReducePercent } from '../combat/castTime'
import { playerAttackTiming } from '../combat/preRenewalAspd'
import { getItemCombatStats } from './itemCatalog'
import { effectiveStats } from './effectiveStats'
import { getEquippedWeaponClass } from '../combat/playerAttackRange'
import { skillPassiveHitBonus } from '../combat/skillPassives'
import { rentalSpeedMultiplier } from './rental'
import { moveSpeedFromAgi } from './statFormulas'

export type CombatStatPreview = {
  hp: number
  hpMax: number
  mp: number
  mpMax: number
  moveSpeed: number
  aspdDisplay: number
  attackIntervalMs: number
  attacksPerSecond: number
  statusAtk: number
  weaponAtk: number
  atk: number
  matkMin: number
  matkMax: number
  def: number
  mdef: number
  hit: number
  flee: number
  critChancePercent: number
  variableCastReducePercent: number
}

export function buildCombatStatPreview(state: CharacterSessionState): CombatStatPreview {
  const stats = effectiveStats(state)
  const baseLevel = state.progress.baseLevel
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  const statusAtk = calcStatusAtk(baseLevel, stats.str, stats.dex, stats.luk)
  const gearAffixes = sumEquippedCombatAffixes(state.equipment)
  const hpMax = sessionMaxHp(state)
  const mpMax = sessionMaxMp(state)
  const moveSpeed = Math.round(moveSpeedFromAgi(stats.agi) * rentalSpeedMultiplier(state))
  const attackTiming = playerAttackTiming(state)

  return {
    hp: state.hp,
    hpMax,
    mp: state.mp,
    mpMax,
    moveSpeed,
    aspdDisplay: attackTiming.aspdDisplay,
    attackIntervalMs: attackTiming.attackIntervalMs,
    attacksPerSecond: attackTiming.attacksPerSecond,
    statusAtk,
    weaponAtk,
    atk: statusAtk + weaponAtk,
    matkMin: calcStatusMatkMin(stats.int),
    matkMax: calcStatusMatkMax(stats.int),
    def: stats.vit + gearAffixes.def,
    mdef: stats.int + gearAffixes.mdef,
    hit:
      calcHit(baseLevel, stats.dex, stats.luk) +
      skillPassiveHitBonus(state.skills, getEquippedWeaponClass(state.equipment)),
    flee: calcFlee(baseLevel, stats.agi, stats.luk),
    critChancePercent: calcCritChancePercent(sumEquippedCritChancePercent(state.equipment), {
      attackerLuk: stats.luk,
    }),
    variableCastReducePercent: calcDexVariableCastReducePercent(stats.dex),
  }
}
