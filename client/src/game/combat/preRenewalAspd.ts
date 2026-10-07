import { loadRoContent } from '../../content/ro/loadContent'
import type { RoAspdWeaponClass } from '../../content/ro/types'
import type { CharacterSessionState, EquipSlot } from '../character/characterState'
import { effectiveStats } from '../character/effectiveStats'
import { getItemDefinition } from '../character/itemCatalog'
import { getEquippedWeaponClass } from './playerAttackRange'

/** Minimum ms between player basic/melee attacks (animation floor). */
export const MIN_PLAYER_ATTACK_INTERVAL_MS = 200

/** Novice unarmed reference interval at 1 AGI / 1 DEX (for tests). */
export const NOVICE_UNARMED_ATTACK_INTERVAL_MS = 1100

export type PreRenewalAspdInput = {
  jobId: string
  weaponClass: RoAspdWeaponClass
  agi: number
  dex: number
  shieldEquipped: boolean
  speedModifier?: number
}

export type PlayerAttackTiming = {
  aspdDisplay: number
  attackIntervalMs: number
  attacksPerSecond: number
}

function weaponDelayFromBaseAspd(baseAspdAt1Agi1Dex: number): number {
  return 200 - baseAspdAt1Agi1Dex
}

function lookupJobAspdRow(jobId: string) {
  const pack = loadRoContent()
  const row = pack.aspd.jobs.find((j) => j.jobId === jobId)
  return row ?? pack.aspd.jobs.find((j) => j.jobId === 'novice')!
}

function hasShieldEquipped(equipment: Record<EquipSlot, string | null>): boolean {
  const offhandId = equipment.offhand
  if (!offhandId) return false
  const def = getItemDefinition(offhandId)
  return def?.offhandKind === 'shield'
}

/** Classic Pre-Renewal ASPD (0–190 display) per iRO Wiki Classic. */
export function calcPreRenewalAspd(input: PreRenewalAspdInput): PlayerAttackTiming {
  const row = lookupJobAspdRow(input.jobId)
  const baseAspd = row.baseAspdAt1Agi1Dex[input.weaponClass]
  const wd = weaponDelayFromBaseAspd(baseAspd)
  const agi = Math.max(1, input.agi)
  const dex = Math.max(1, input.dex)
  const statNumerator = (wd * agi) / 25 + (wd * dex) / 100
  const statTerm = Math.round(statNumerator / 10)
  const sm = Math.max(0, input.speedModifier ?? 0)
  let aspd = 200 - (wd - statTerm) * (1 - sm)
  if (input.shieldEquipped) {
    aspd -= row.shieldAspdPenalty
  }
  aspd = Math.min(190, Math.max(100, aspd))
  const aspdFloor = Math.floor(aspd)
  const delaySeconds = (200 - aspdFloor) / 50
  const attackIntervalMs = Math.max(MIN_PLAYER_ATTACK_INTERVAL_MS, Math.round(delaySeconds * 1000))
  const attacksPerSecond = Math.round((1000 / attackIntervalMs) * 10) / 10
  return { aspdDisplay: aspdFloor, attackIntervalMs, attacksPerSecond }
}

export function playerAttackTiming(
  state: CharacterSessionState,
  opts?: { speedModifier?: number },
): PlayerAttackTiming {
  const stats = effectiveStats(state)
  const weaponClass = getEquippedWeaponClass(state.equipment) as RoAspdWeaponClass
  return calcPreRenewalAspd({
    jobId: state.jobId,
    weaponClass,
    agi: stats.agi,
    dex: stats.dex,
    shieldEquipped: hasShieldEquipped(state.equipment),
    speedModifier: opts?.speedModifier,
  })
}
