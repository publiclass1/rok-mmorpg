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
import { playerAttackTiming } from '../combat/preRenewalAspd'
import { getItemCombatStats } from './itemCatalog'
import { effectiveStats } from './effectiveStats'
import { rentalSpeedMultiplier } from './rental'
import { derivedMaxHp, derivedMaxMp, moveSpeedFromAgi } from './statFormulas'

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
}

export function buildCombatStatPreview(state: CharacterSessionState): CombatStatPreview {
  const stats = effectiveStats(state)
  const baseLevel = state.progress.baseLevel
  const weapon = state.equipment.weapon ? getItemCombatStats(state.equipment.weapon) : null
  const weaponAtk = weapon?.weaponAtk ?? 0
  const statusAtk = calcStatusAtk(baseLevel, stats.str, stats.dex, stats.luk)
  const hpMax = derivedMaxHp(state.jobId, baseLevel, stats.vit)
  const mpMax = derivedMaxMp(state.jobId, baseLevel, stats.int)
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
    def: stats.vit,
    mdef: stats.int,
    hit: calcHit(baseLevel, stats.dex, stats.luk),
    flee: calcFlee(baseLevel, stats.agi, stats.luk),
    critChancePercent: calcCritChancePercent(sumEquippedCritChancePercent(state.equipment), {
      attackerLuk: stats.luk,
    }),
  }
}
